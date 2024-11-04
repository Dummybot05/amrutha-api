import { regForMail, regForPassword } from './constraints.js';
import { neon } from "@neondatabase/serverless";
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
config();

const sql = neon(process.env.DATABASE_URL);

const login = async (req, res) => {
    const { email, password } = req.body;

    const checkEmail = regForMail.test(email);
    const checkPassword = regForPassword.test(password);

    if (checkEmail && checkPassword) {
        const lowerEmail = email.toLowerCase();
        try {
            const [{ exists }] = await sql`
           SELECT EXISTS(SELECT 1 FROM clients WHERE email_address = ${lowerEmail}) as exists
        `;
            if (exists) {
                try {
                    const result = await sql`
                        SELECT * FROM clients WHERE email_address = ${lowerEmail}
                    `;
                    const comparePassword = await bcrypt.compare(password, result[0].password);
                    if (comparePassword) {
                        req.session.user = result[0];
                        res.status(201).send({ status: "success", message: "Login Success" });
                        return;
                    } else {
                        res.status(400).send({ status: "failed", message: "Password not MATCH" });
                        return;
                    }
                } catch (e) {
                    res.status(500).send({ status: "failed", message: e.message });
                    return
                }
            }
            res.status(400).send({ status: "failed", message: "Email already EXIST" });
            return;
        } catch (e) {
            res.status(500).send({ status: "failed", message: e.message });
            return;
        }

    } else {
        const chkPostData = checkEmail
            ? { status: "failed", message: "Invalid Password" }
            : { status: "failed", message: "Invalid Email" };
        res.status(400).send(chkPostData);
        return;
    }
}

export default login;