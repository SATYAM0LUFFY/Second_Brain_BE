import express, { json } from "express";
import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";
import z, { string } from "zod";
import bcrypt from "bcrypt";
import { Response, Request, NextFunction } from "express";
import cros from "cors";
import dotenv from "dotenv";

dotenv.config();


import { userModel, contentModel, shareModel } from "./db";

const app = express();

const PORT  =   3000;
const Users: number = 0;
const Visit: number = 0;
const saltRounds: number = 5;
const JWT_SECRET = process.env.JWT_SECRET;

main();

app.use(express.json()); // if req.body is undefined berore and after that it becomes defined ..
app.use(cros());

app.get("/api/v1/check", (req, res) => {
  res.send(
    `api is working and the no. of users are ${Users} and no. of visits are ${Visit}`
  );
});

app.post("/api/v1/signup", async function (req, res) {

  const userName: string = req.body.userName;
  const password: string = req.body.password;
  const email: string = req.body.email;

  const prevUser = await userModel.findOne({ email: email });

  if (prevUser == null) {
    const zodSchema = z.object({
      userName: z
        .string()
        .min(5, { message: `Minimum Username Length should be 5` }),
      password: z
        .string()
        .min(8, { message: `Minimum Password Length Must be 8` })
        .max(18, { message: `Maximum Password Length Must be 18` })
        .refine((password) => /[A-Z]/.test(password), {
          message: `Password Must Contain Capital Letter`,
        })
        .refine((password) => /[a-z]/.test(password), {
          message: `Password Must Contain One Small Letter`,
        })
        .refine((password) => /[0-9]/.test(password), {
          message: `Password Must Contain One Digit`,
        })
        .refine((password) => /[!@#$%^&*]/.test(password), {
          message: `Password Must Contain One Special Charecter`,
        }),
      email: z.string().email({ message: `Enter Valid Email` }),
    });

    const parsed = zodSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(200).json({
        status: 2,
        message: parsed.error.issues[0].message,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      await userModel.create({
        userName: userName,
        password: hashedPassword,
        email: email,
      });

      res.status(200).json({
        status: 1,
        message: `Thankyou ${userName}`,
      });
    } catch (err) {
      res.status(200).json({
        status: 4,
        message: `Try Again`,
        error: err,
      });
      console.log(err);
    }
  } else {
    res.status(200).json({
      status: 3,
      message: `User Already Exists`,
    });
  }
});

app.post("/api/v1/signin", async function (req, res) {
  const email: string = req.body.email;
  const password: string = req.body.password;

  const user = await userModel.findOne({ email: email });

  if (!user) {
    res.status(200).json({
      status: 2,
      message: `You Do Not Have an Account Please Create One`,
    });
    return;
  }

  const checkPassword = await bcrypt.compare(password, user.password);

  if (!checkPassword) {
    res.status(200).json({
      status: 3,
      message: `Wrong Credentials`,
    });
    return;
  }

  const token: string = jwt.sign(
    {
      id: user._id,
    },
    JWT_SECRET as string
  );

  res.status(200).json({
    status: 1,
    message: `User Signed In Sucessfully`,
    token: token,
  });
});

app.get("/api/v1/user", auth, async (req, res) => {
  const userId = req.body.userId;
  const userData = await userModel.findOne({ _id: userId });
  res.status(200).json({
    userData,
    message: `Your Data is Recevied `,
  });
});

app.post("/api/v1/content", auth, async (req, res) => {
  const userId = req.body.userId;
  const date: Date = new Date();

  try {
    await contentModel.create({
      link: req.body.link,
      title: req.body.title,
      type: req.body.type,
      userId: userId,
      time: date.toDateString(),
      tag: req.body.tag,
      discription: req.body.discription,
    });

    res.status(200).json({
      message: `You Content Was Saved`,
    });
  } catch (err) {
    res.status(200).json({
      status: 2,
      message: `Your Content Did Not Get Saved `,
    });
  }
});

app.get("/api/v1/content", auth, async (req, res) => {
  const userId: string = req.body.userId;

  const userData = await contentModel.find({ userId: userId });

  res.status(200).json({
    message: `Data Send`,
    userData,
  });
});

app.delete("/api/v1/delete", auth, async (req, res) => {
  const contentId = req.body.contentId;
  const userContent = await contentModel.findOne({ _id: contentId });
  try {
    if (userContent?.userId == req.body.userId) {
      try {
        await contentModel.deleteOne({ _id: contentId });
        res.status(200).json({
          status: 1,
          message: `Content Deleted`,
        });
      } catch (err) {
        res.status(200).json({
          status: 3,
          message: `Try Again Content Not Deleted `,
          error: err,
        });
      }
    } else {
      res.status(200).json({
        status: 2,
        message: `You Are Not Allowed To Delete `,
      });
    }
  } catch (err) {
    res.json({
      status: 3,
      message: `Your Content Is Not Deleted `,
      error: err,
    });
  }
});

app.put("/api/v1/change/password", auth, async (req, res) => {
  const userId = req.body.userId;
  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;

  const userData = await userModel.findOne({ _id: userId });

  if (userData) {
    const check = await bcrypt.compare(oldPassword, userData?.password);
    if (!check) {
      res.status(200).json({
        status: 2,
        message: `You Are Not Allowed To Change PassWord`,
      });
    } else {
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await userModel.updateOne({ password: hashedPassword });
      res.status(200).json({
        status: 1,
        message: `Updated Password `,
      });
    }
  } else {
    res.status(200).json({
      status: 2,
      message: `You Cannot Change PassWord `,
    });
  }
});

app.get("/api/v1/brain/share", auth, async (req, res) => {
  const userId = req.body.userId;
  try {
    const userData = await shareModel.findOne({ userId: userId });
    if (userData) {
      res.status(200).json({
        share: true,
        lastLink: userData.link,
      });
    } else {
      res.status(200).json({
        share: false,
      });
    }
  } catch (e) {
    res.status(200).json({
      message: `Try Again`,
    });
  }
}); // to get info if a user is sharing all data or not i.e sharing data of a user

app.post("/api/v1/brain/share", auth, async (req, res) => {
  const share: string = req.body.share;
  const userId = req.body.userId;
  if (share == "false") {
    await shareModel.deleteOne({ userId: userId });
    res
      .status(200)
      .json({ message: `You Stopped Sharing With Link`, status: 1 });
    return;
  } else {
    const LinkLast: string = RandomShare(10);
    await shareModel.create({
      userId: userId,
      share: "true",
      link: LinkLast,
    });
    res.status(200).json({
      message: `Share Link Created`,
      LinkLast: LinkLast,
    });
  }
});

app.get("/api/v1/brain/:shareLink", async (req, res) => {
  const lastLink: string = req.params.shareLink;
  try {
    const shareData = await shareModel.findOne({ link: lastLink });

    if (!shareData) {
      res.json({ message: `Auther Not Sharing His Brain Any More` });
      return;
    }
    const userContent = await contentModel.find({ userId: shareData.userId });

    res.json({
      message: `Content Sent`,
      userContent,
    });
  } catch (e) {
    res.json({
      message: `Error while Acessing Brain `,
      err: e,
    });
  }
});

async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers["token"];

    if (!token || typeof token !== "string") {
      res.status(200).json({ message: `Login First` });
      return; // Ensure no further execution
    }

    const decodedId = jwt.verify(token, JWT_SECRET as string); // object contaniing id
    req.body.userId = (decodedId as JwtPayload).id;
    next();
  } catch (err) {
    res.status(200).json({
      message: `Login First`,
      error: err,
    });
  }
}

async function main() {
  app.listen(PORT, () => {
    console.log(`listening on PORT ${PORT}`);
  });
  await mongoose.connect(process.env.MONGODB_CONNECTION_URL as string);
  console.log("db connected ");
}

function RandomShare(len: number) {
  const pick: string = "qwertyyuiopasdfghjklzxcvbnm1234567890";
  const lenght: number = pick.length;
  let ans: string = ``;

  for (let i = 0; i < len; i++) {
    ans = ans + pick.charAt(Math.random() * lenght);
  }

  return ans;
}
