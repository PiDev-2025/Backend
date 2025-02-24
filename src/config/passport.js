const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel"); // Import User model

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({
                    _id: profile.id
                });


                if (!user) {
                    user = new User({
                        _id: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        password: profile.password,  // Default empty password
                        phone: profile.phone,  // Default null phone
                    });
                    await user.save();
                }

                return done(null, user);
            } catch (err) {
                console.error("Error saving user:", err);
                return done(err, null);
            }
        }
    )
);

// Serialize user to store in session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
