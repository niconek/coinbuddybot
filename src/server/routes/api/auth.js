const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const {
    upload,
    uploadQRCode
} = require("../../utils/upload");

router.post("/sign-up", (req, res) => {
    const {
        email,
        password
    } = req.body;
    let picture;

    if (!email || !password)
        res.status(400).send({
            error: "Missing Credentials."
        });

    User.findOne({
            email
        })
        .then(existingUser => {
            if (existingUser)
                return res.status(400).send({
                    error: "E-Mail exists already."
                });

            return req.files && req.files.picture ?
                upload(req.files.picture) :
                Promise.resolve();
        })
        .then(pictureUrl => {
            picture = pictureUrl;
            return uploadQRCode(email);
        })
        .then(qrCode => {
            const hashedPassword = bcrypt.hashSync(password, 10);
            return new User({
                email,
                password: hashedPassword,
                profilePicture: picture,
                qrCode: String(qrCode)
            }).save();
        })
        .then(user => {
            const token = jwt.sign({
                    _id: user._id,
                    email: user.email,
                    profilePicture: user.profilePicture,
                    qrCode: user.qrCode
                },
                config.SECRET_JWT_PASSPHRASE
            );
            res.send({
                token
            });
        });
});

router.post("/sign-in", (req, res) => {
    const {
        email,
        password
    } = req.body;

    if (!email || !password)
        res.status(400).send({
            error: "Missing Credentials."
        });

    User.findOne({
        email
    }).then(existingUser => {
        if (!existingUser)
            return res.status(400).send({
                error: "User does not exist."
            });

        const passwordsMatch = bcrypt.compareSync(password, existingUser.password);

        if (!passwordsMatch)
            return res.status(400).send({
                error: "Password is incorrect."
            });

        const token = jwt.sign({
                _id: existingUser._id,
                email: existingUser.email,
                profilePicture: existingUser.profilePicture,
                qrCode: existingUser.qrCode,
                chatId: existingUser.chatId
            },
            config.SECRET_JWT_PASSPHRASE
        );
        res.send({
            token
        });
    });
});

module.exports = router;