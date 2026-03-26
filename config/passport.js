const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('../models/userModel');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/user/google/callback`,
    passReqToCallback: true
},
async function(request, accessToken, refreshToken, profile, done) {
    try {
        let user = await User.findOne({ 
            $or: [
                { googleId: profile.id }, 
                { email: profile.email }
            ] 
        });

        if (!user) {
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.email,
                image: profile.picture
            });
            await user.save();
        } else if (!user.googleId) {
            // Linking Google ID to existing email account
            user.googleId = profile.id;
            if(!user.image) user.image = profile.picture;
            await user.save();
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
