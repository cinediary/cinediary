-- O Clerk manda um avatar genérico (img.clerk.com/<base64 de {"type":"default"...}>) para quem não
-- enviou foto, e ele vinha sendo salvo como foto. Regra nova: sem foto enviada, o app mostra a inicial
-- do nome. Limpa os que já estavam salvos; fotos enviadas (type "proxy") não são tocadas.
UPDATE users SET avatar_url = NULL WHERE avatar_url LIKE 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdC%';
