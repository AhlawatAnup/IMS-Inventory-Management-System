const user = require('../database/userModel');

async function sendUserDetails(req, res) {
  try {
    const userSession = req.session.user;

    if (!userSession) {
      return res.status(401).json({
        message: 'not authorised!',
      });
    }

    const currentUser = await user.findById({ _id: userSession.id });
    return res.status(200).json({
      currentUser,
    });
  } catch (error) {
    console.log('error in sending user details from session: ', error);
    return res.status(500).json({
      message: 'Internal server error in fetching user details!',
    });
  }
}

module.exports = { sendUserDetails };
