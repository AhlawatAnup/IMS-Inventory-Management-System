const path = require('path');
const publicPath = path.join(__dirname, '../../public');

exports.getDashboard = (req, res) => {
  if (req.session.role == 'admin') {
    console.log('Admin dashboard received\npublic path: ', publicPath);
    return res.sendFile(path.join(publicPath, 'admin.pack', 'admin.html'));
  } else if (req.session.role == 'user') {
    console.log('User dashboard received\npublic path: ', publicPath);
    return res.sendFile(path.join(publicPath, 'user.pack', 'user.html'));
  }
};
