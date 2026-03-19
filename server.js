import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import nodemailer from 'nodemailer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONTENT_FILE = path.join(__dirname, 'cms.content.json')
const INQUIRIES_FILE = path.join(__dirname, 'inquiries.json')
const UPLOADS_DIR = path.join(__dirname, 'uploads')

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 8787)
const jwtSecret = process.env.JWT_SECRET || 'please-change-jwt-secret'
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 5)
const captchaTtlMs = Number(process.env.CAPTCHA_TTL_MS || 5 * 60_000)
const sessionTtlSec = Number(process.env.SESSION_TTL_SEC || 8 * 60 * 60)
const adminUsers = JSON.parse(
  process.env.ADMIN_USERS_JSON ||
    '[{"username":"admin","password":"admin123","role":"admin"},{"username":"editor","password":"editor123","role":"editor"}]',
)

app.set('trust proxy', true)

const corsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      if (corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

await fs.mkdir(UPLOADS_DIR, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.png'
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2, 8)}${safeExt}`)
    },
  }),
  limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 2 * 1024 * 1024) },
})

const captchaStore = new Map()
const inquiryRateStore = new Map()
const sessionStore = new Map()

async function readJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallbackValue
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function pickLanguage(lang) {
  if (lang === 'en') return 'en'
  if (lang === 'zh') return 'zh'
  return 'ja'
}

function validateInquiry(payload) {
  const required = ['company', 'contact', 'phone', 'message']
  return required.every((key) => typeof payload[key] === 'string' && payload[key].trim())
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

function createCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const captchaId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  captchaStore.set(captchaId, {
    answer: String(a + b),
    expiresAt: Date.now() + captchaTtlMs,
  })
  return { captchaId, question: `${a} + ${b} = ?` }
}

function verifyCaptcha(captchaId, captchaAnswer) {
  const found = captchaStore.get(captchaId)
  if (!found) return false
  captchaStore.delete(captchaId)
  if (found.expiresAt < Date.now()) return false
  return String(captchaAnswer || '').trim() === found.answer
}

function isRateLimited(ip) {
  const now = Date.now()
  const record = inquiryRateStore.get(ip) || []
  const validHits = record.filter((time) => now - time < rateLimitWindowMs)
  if (validHits.length >= rateLimitMax) {
    inquiryRateStore.set(ip, validHits)
    return true
  }
  validHits.push(now)
  inquiryRateStore.set(ip, validHits)
  return false
}

function createToken(user) {
  const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const expiresAt = Date.now() + sessionTtlSec * 1000
  sessionStore.set(sessionId, { username: user.username, role: user.role, expiresAt })
  return jwt.sign({ sid: sessionId, role: user.role, username: user.username }, jwtSecret, {
    expiresIn: sessionTtlSec,
  })
}

function authenticate(req, res, next) {
  const authHeader = req.header('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    res.status(401).json({ message: 'missing token' })
    return
  }
  try {
    const decoded = jwt.verify(token, jwtSecret)
    const session = sessionStore.get(decoded.sid)
    if (!session || session.expiresAt < Date.now()) {
      res.status(401).json({ message: 'session expired' })
      return
    }
    req.user = {
      username: decoded.username,
      role: decoded.role,
      sid: decoded.sid,
    }
    next()
  } catch {
    res.status(401).json({ message: 'invalid token' })
  }
}

function authorize(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'forbidden' })
      return
    }
    next()
  }
}

function getMailTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

async function sendEmailNotification(inquiry) {
  const transporter = getMailTransporter()
  const to = process.env.NOTIFY_EMAIL_TO
  const from = process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER
  if (!transporter || !to || !from) {
    return { channel: 'email', sent: false, reason: 'missing smtp config' }
  }

  const subject = `[官网需求] ${inquiry.company} - ${inquiry.contact}`
  const text = [
    `语言: ${inquiry.lang}`,
    `企业名称: ${inquiry.company}`,
    `联系人: ${inquiry.contact}`,
    `联系电话: ${inquiry.phone}`,
    `需求描述: ${inquiry.message}`,
    `来源页面: ${inquiry.sourceUrl || '-'}`,
  ].join('\n')

  await transporter.sendMail({ from, to, subject, text })
  return { channel: 'email', sent: true }
}

async function postWebhook(url, payload) {
  if (!url) {
    return false
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.ok
}

async function sendWebhookNotifications(inquiry) {
  const message = [
    '官网新需求线索',
    `语言: ${inquiry.lang}`,
    `企业名称: ${inquiry.company}`,
    `联系人: ${inquiry.contact}`,
    `联系电话: ${inquiry.phone}`,
    `需求描述: ${inquiry.message}`,
    `来源页面: ${inquiry.sourceUrl || '-'}`,
    `提交时间: ${inquiry.createdAt}`,
  ].join('\n')

  const wecomUrl = process.env.WECOM_WEBHOOK_URL
  const feishuUrl = process.env.FEISHU_WEBHOOK_URL

  const [wecomOk, feishuOk] = await Promise.all([
    postWebhook(wecomUrl, { msgtype: 'text', text: { content: message } }),
    postWebhook(feishuUrl, { msg_type: 'text', content: { text: message } }),
  ])

  return [
    {
      channel: 'wecom',
      sent: wecomOk,
      reason: wecomUrl ? undefined : 'missing wecom webhook',
    },
    {
      channel: 'feishu',
      sent: feishuOk,
      reason: feishuUrl ? undefined : 'missing feishu webhook',
    },
  ]
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/captcha', (_req, res) => {
  res.json(createCaptcha())
})

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '').trim()
  const user = adminUsers.find((item) => item.username === username && item.password === password)
  if (!user) {
    res.status(401).json({ message: 'invalid credentials' })
    return
  }
  const token = createToken(user)
  res.json({ token, role: user.role, username: user.username })
})

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ role: req.user.role, username: req.user.username })
})

app.post('/api/auth/logout', authenticate, (req, res) => {
  sessionStore.delete(req.user.sid)
  res.json({ ok: true })
})

app.get('/api/content', async (req, res) => {
  const content = await readJson(CONTENT_FILE, {})
  const lang = req.query.lang
  if (!lang) {
    res.json(content)
    return
  }
  const picked = pickLanguage(String(lang))
  res.json(content[picked] || {})
})

app.put('/api/content', authenticate, authorize(['admin', 'editor']), async (req, res) => {
  const incoming = req.body
  if (!incoming || typeof incoming !== 'object' || !incoming.ja || !incoming.zh || !incoming.en) {
    res.status(400).json({ message: 'content payload must include ja, zh and en' })
    return
  }

  await writeJson(CONTENT_FILE, incoming)
  res.json({ ok: true })
})

app.get('/api/cases/:slug', async (req, res) => {
  const lang = pickLanguage(String(req.query.lang || 'ja'))
  const content = await readJson(CONTENT_FILE, {})
  const items = content[lang]?.casesSection?.items || []
  const target = items.find((item) => item.slug === req.params.slug)
  if (!target) {
    res.status(404).json({ message: 'case not found' })
    return
  }
  res.json(target)
})

app.post('/api/inquiries', async (req, res) => {
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    res.status(429).json({ message: 'too many requests' })
    return
  }

  if (!verifyCaptcha(req.body.captchaId, req.body.captchaAnswer)) {
    res.status(400).json({ message: 'invalid captcha' })
    return
  }

  const lang = pickLanguage(String(req.body.lang || 'ja'))
  const inquiry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    lang,
    company: String(req.body.company || '').trim(),
    contact: String(req.body.contact || '').trim(),
    phone: String(req.body.phone || '').trim(),
    message: String(req.body.message || '').trim(),
    sourceUrl: String(req.body.sourceUrl || '').trim(),
    createdAt: new Date().toISOString(),
  }

  if (!validateInquiry(inquiry)) {
    res.status(400).json({ message: 'invalid inquiry payload' })
    return
  }

  const emailResult = await sendEmailNotification(inquiry).catch((error) => ({
    channel: 'email',
    sent: false,
    reason: error.message,
  }))
  const webhookResults = await sendWebhookNotifications(inquiry).catch((error) => [
    { channel: 'wecom', sent: false, reason: error.message },
    { channel: 'feishu', sent: false, reason: error.message },
  ])

  const allResults = [emailResult, ...webhookResults]
  const records = await readJson(INQUIRIES_FILE, [])
  records.unshift({
    ...inquiry,
    notifications: allResults,
  })
  await writeJson(INQUIRIES_FILE, records.slice(0, 500))

  res.json({
    ok: true,
    notifications: allResults,
  })
})

app.post('/api/media/upload', authenticate, authorize(['admin', 'editor']), upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'missing file' })
    return
  }
  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  })
})

app.get('/api/media', authenticate, authorize(['admin', 'editor']), async (_req, res) => {
  const files = await fs.readdir(UPLOADS_DIR)
  const list = files.map((name) => ({
    filename: name,
    url: `/uploads/${name}`,
  }))
  res.json(list)
})

app.delete('/api/media/:filename', authenticate, authorize(['admin']), async (req, res) => {
  const filename = path.basename(req.params.filename)
  const filePath = path.join(UPLOADS_DIR, filename)
  try {
    await fs.unlink(filePath)
    res.json({ ok: true })
  } catch {
    res.status(404).json({ message: 'file not found' })
  }
})

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`)
})
