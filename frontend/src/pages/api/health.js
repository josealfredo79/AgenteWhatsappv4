export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
  });
}
