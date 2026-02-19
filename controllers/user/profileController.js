
const { text } = require('express');
const User = require('../../models/userSchema')
const env = require('dotenv').config();
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')




function generateOtp() {
    const digits = "1234567890"
    let otp = ""
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)]
    }
    return otp;
}


const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })


        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "our otp forpassword reset",
            text: `Your ot is ${otp}`,
            html: `<b><h4>your otp:${otp}</h4></b>`
        }
        const info = await transporter.sendMail(mailOptions)
        console.log("email sent", info.messageId)
        return true
    } catch (error) {
        console.log("error sending email", error)
        return false
    }
}

const securePassword = async (password) => {
    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (error) {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    }
}




const getforgotPassword = async (req, res) => {
    try {
        res.render('forgot_password')
    } catch (error) {
        res.redirect("/Page404")
    }
}



const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body
        const findUser = await User.findOne({ email: email })

        if (findUser) {
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email, otp)
            if (emailSent) {
                req.session.userOtp = otp
                req.session.email = email
                res.render('forgotPass-otp', { message: "Your OTP is incorrect" })
                console.log("OTP:", otp)
            } else {
                res.json({ success: false, message: 'Failed to send OTP, plese try again' })
            }
        } else {
            res.render("forgot_password", { message: "User with this email does not exist" })
        }
    } catch (error) {
        res.redirect("/Page404")
    }
}



const verifyForgotPassOtp = async (req, res) => {
    try {

        const enterdOtp = req.body.otp
        if (enterdOtp == req.session.userOtp) {
            res.json({ success: true, redirectUrl: '/reset-password' })
        } else {
            res.json({ success: false, message: 'otp not matching' })
        }


    } catch {
        res.status(500).json({ success: false, message: 'An Error Occured, Please Tey Again' })
    }
}



const getResetPassPage = async (req, res) => {
    try {
        res.render("reset-password")

    } catch (eroor) {
        res.redirect('/Page404')
    }
}



const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Resend Otp:", otp)
        res.status(200).json({ success: true, message: "Resend Otp Successful" })
    } catch (error) {
        console.error("Error in Resend Otp", error)
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }

}




const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body
        const email = req.session.email
        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1)
            console.log(passwordHash)
            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } })
            console.log("Session email:", req.session.email);

            res.redirect('/login')
        } else {
            res.render('reset-password', { message: 'Password do not Match' })
        }
    } catch (error) {
        res.redirect('/Page404')
    }
}





module.exports = { forgotEmailValid, getforgotPassword, verifyForgotPassOtp, getResetPassPage, resendOtp, postNewPassword }