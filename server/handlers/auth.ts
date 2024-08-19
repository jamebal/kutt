import { addMinutes, differenceInMinutes, subMinutes } from "date-fns";
import { Handler } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import nanoid from "nanoid";
import { v4 as uuid } from "uuid";
import axios from "axios";

import * as utils from "../utils";
import { CustomError } from "../utils";
import * as redis from "../redis";
import * as mail from "../mail";
import query from "../queries";
import env from "../env";

const authenticate = (
  type: "jwt" | "local" | "localapikey",
  error: string,
  isStrict = true
) =>
  async function auth(req, res, next) {
    if (req.user) return next();

    passport.authenticate(type, (err, user) => {
      if (err) return next(err);

      if (!user && isStrict) {
        throw new CustomError(error, 401);
      }

      if (user && isStrict && !user.verified) {
        throw new CustomError(
          "您的电子邮件地址未经过验证。" +
            "点击注册以再次获取验证链接。",
          400
        );
      }

      if (user && user.banned) {
        console.log("user", user);
        throw new CustomError("您已被禁止使用此站", 403);
      }

      if (user) {
        req.user = {
          ...user,
          admin: utils.isAdmin(user.email)
        };
        return next();
      }
      return next();
    })(req, res, next);
  };

export const local = authenticate("local", "登录凭证错误");
export const jwt = authenticate("jwt", "未经授权");
export const jwtLoose = authenticate("jwt", "未经授权", false);
export const apikey = authenticate(
  "localapikey",
  "API 密钥不正确",
  false
);

export const cooldown: Handler = async (req, res, next) => {
  if (env.DISALLOW_ANONYMOUS_LINKS) return next();
  const cooldownConfig = env.NON_USER_COOLDOWN;
  if (req.user || !cooldownConfig) return next();

  const ip = await query.ip.find({
    ip: req.realIP.toLowerCase(),
    created_at: [">", subMinutes(new Date(), cooldownConfig).toISOString()]
  });

  if (ip) {
    const timeToWait =
      cooldownConfig - differenceInMinutes(new Date(), new Date(ip.created_at));
    throw new CustomError(
      `未登录用户受到限制。等待 ${timeToWait} 分钟或登录`,
      400
    );
  }
  next();
};

export const recaptcha: Handler = async (req, res, next) => {
  if (env.isDev || req.user) return next();
  if (env.DISALLOW_ANONYMOUS_LINKS) return next();
  if (!env.RECAPTCHA_SECRET_KEY) return next();

  const isReCaptchaValid = await axios({
    method: "post",
    url: "https://www.google.com/recaptcha/api/siteverify",
    headers: {
      "Content-type": "application/x-www-form-urlencoded"
    },
    params: {
      secret: env.RECAPTCHA_SECRET_KEY,
      response: req.body.reCaptchaToken,
      remoteip: req.realIP
    }
  });

  if (!isReCaptchaValid.data.success) {
    throw new CustomError("reCAPTCHA 无效。请再试一次。", 401);
  }

  return next();
};

export const admin: Handler = async (req, res, next) => {
  if (req.user.admin) return next();
  throw new CustomError("未经授权", 401);
};

export const signup: Handler = async (req, res) => {
  const salt = await bcrypt.genSalt(12);
  const password = await bcrypt.hash(req.body.password, salt);

  const user = await query.user.add(
    { email: req.body.email, password },
    req.user
  );

  await mail.verification(user);

  return res.status(201).send({ message: "已发送验证电子邮件" });
};

export const token: Handler = async (req, res) => {
  const token = utils.signToken(req.user);
  return res.status(200).send({ token });
};

export const verify: Handler = async (req, res, next) => {
  if (!req.params.verificationToken) return next();

  const [user] = await query.user.update(
    {
      verification_token: req.params.verificationToken,
      verification_expires: [">", new Date().toISOString()]
    },
    {
      verified: true,
      verification_token: null,
      verification_expires: null
    }
  );

  if (user) {
    req.token = utils.signToken(user);
  }

  return next();
};

export const changePassword: Handler = async (req, res) => {
  const salt = await bcrypt.genSalt(12);
  const password = await bcrypt.hash(req.body.password, salt);

  const [user] = await query.user.update({ id: req.user.id }, { password });

  if (!user) {
    throw new CustomError("无法更改密码。稍后再试");
  }

  return res
    .status(200)
    .send({ message: "您的密码已成功更改" });
};

export const generateApiKey: Handler = async (req, res) => {
  const apikey = nanoid(40);

  redis.remove.user(req.user);

  const [user] = await query.user.update({ id: req.user.id }, { apikey });

  if (!user) {
    throw new CustomError("无法生成 API 密钥。请稍后再试");
  }

  return res.status(201).send({ apikey });
};

export const resetPasswordRequest: Handler = async (req, res) => {
  const [user] = await query.user.update(
    { email: req.body.email },
    {
      reset_password_token: uuid(),
      reset_password_expires: addMinutes(new Date(), 30).toISOString()
    }
  );

  if (user) {
    await mail.resetPasswordToken(user);
  }

  return res.status(200).send({
    message: "如果电子邮件地址存在，则已发送重置密码电子邮件"
  });
};

export const resetPassword: Handler = async (req, res, next) => {
  const { resetPasswordToken } = req.params;

  if (resetPasswordToken) {
    const [user] = await query.user.update(
      {
        reset_password_token: resetPasswordToken,
        reset_password_expires: [">", new Date().toISOString()]
      },
      { reset_password_expires: null, reset_password_token: null }
    );

    if (user) {
      req.token = utils.signToken(user as UserJoined);
    }
  }
  return next();
};

export const signupAccess: Handler = (req, res, next) => {
  if (!env.DISALLOW_REGISTRATION) return next();
  return res.status(403).send({ message: "不允许注册" });
};

export const changeEmailRequest: Handler = async (req, res) => {
  const { email, password } = req.body;

  const isMatch = await bcrypt.compare(password, req.user.password);

  if (!isMatch) {
    throw new CustomError("密码错误", 400);
  }

  const currentUser = await query.user.find({ email });

  if (currentUser) {
    throw new CustomError("无法使用此电子邮件地址", 400);
  }

  const [updatedUser] = await query.user.update(
    { id: req.user.id },
    {
      change_email_address: email,
      change_email_token: uuid(),
      change_email_expires: addMinutes(new Date(), 30).toISOString()
    }
  );

  redis.remove.user(updatedUser);

  if (updatedUser) {
    await mail.changeEmail({ ...updatedUser, email });
  }

  return res.status(200).send({
    message:
      "如果电子邮件地址存在，已经发送了一封包含验证链接的电子邮件"
  });
};

export const changeEmail: Handler = async (req, res, next) => {
  const { changeEmailToken } = req.params;

  if (changeEmailToken) {
    const foundUser = await query.user.find({
      change_email_token: changeEmailToken
    });

    if (!foundUser) return next();

    const [user] = await query.user.update(
      {
        change_email_token: changeEmailToken,
        change_email_expires: [">", new Date().toISOString()]
      },
      {
        change_email_token: null,
        change_email_expires: null,
        change_email_address: null,
        email: foundUser.change_email_address
      }
    );

    redis.remove.user(foundUser);

    if (user) {
      req.token = utils.signToken(user as UserJoined);
    }
  }
  return next();
};
