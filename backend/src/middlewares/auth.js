import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

if (!process.env.JWT_SECRET) {
  // Em serverless (Vercel) process.exit não é adequado — apenas loga o erro crítico
  console.error('FATAL: JWT_SECRET não definido nas variáveis de ambiente.');
}

// Middleware de autenticação JWT
export const authenticateToken = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configuração de segurança ausente no servidor' });
  }
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar role
export const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) return res.status(403).json({ error: 'Permissão negada' });
  next();
};

// Função para hash de senha
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Função para verificar senha
export const verifyPassword = async (password, hashed) => {
  return await bcrypt.compare(password, hashed);
};