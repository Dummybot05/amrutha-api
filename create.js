import { regForMail, regForPassword } from './constraints.js';
import { neon } from "@neondatabase/serverless";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
config();

const sql = neon(process.env.DATABASE_URL);

const create = async (req, res) => {
    const { email, password } = req.body;

    const checkEmail = regForMail.test(email);
    const checkPassword = regForPassword.test(password);

    if (checkEmail && checkPassword) {
        const lowerEmail = email.toLowerCase();
        const hashedPassword = await bcrypt.hash(password, 12);

        try {
            const [{ exists }] = await sql`
                SELECT EXISTS(SELECT 1 FROM clients WHERE email_address = ${lowerEmail}) as exists
            `;
            if (!exists) {
                try {
                    const [{ result }] = await sql`
                       INSERT INTO clients (uuid, email_address, password)
                       VALUES (${uuidv4()}, ${lowerEmail}, ${hashedPassword})
                       RETURNING TRUE as result;
                    `;
                    const chkData = result
                        ? { status: "success", message: "Account Created" }
                        : { status: "failed", message: "Failed to create account" }

                    res.status(result ? 201 : 400).send(chkData);
                    return;
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

export default create;