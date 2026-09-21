export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'server',
    timestamp: new Date().toISOString()
  });
};
