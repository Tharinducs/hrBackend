const secret = require("../_helpers/constant").SECRET_OR_KEY
const express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
var User = require("../models/user");
var randtoken = require("rand-token");
var refreshTokens = {};
const passport = require("passport");

const { check, validationResult } = require("express-validator");

router.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.get_user_by_username(username, async (err, user, result) => {
    //check wether user exists
    if (err) {
      res
        .status(500)
        .json({ state: false, msg: "Something went wrong please try again!" });
    }

    if (user.length === 0) {
      res.status(404).json({ state: false, msg: "No user found" });
    }

    if (user.length !==0) {
      try {
        User.passwordCheck(password, user[0].password, function (err, match) {
          //check wether password is matching or not
          if (err) {
            res
              .status(401)
              .json({ state: false, msg: "your password is incorrect" });
          }

          const user_sel = {
            user_id: user[0].id,
            username: user[0].username,
            email:user[0].email,
            type: user[0].type,
          };
          if (match) {
            const token = jwt.sign(user_sel, secret, {
              //create jwt token for the authorized user
              expiresIn: 1800000,
            });
            var refreshToken = randtoken.uid(256);
            refreshTokens[refreshToken] = user[0].username;
            res.status(200).json({
              state: true,
              accesstoken: token,
              refreshToken: refreshToken,
              user: user_sel,
            });
          } else {
            res
              .status(401)
              .json({ state: false, msg: "password does not match" });
          }
        });
      } catch (error) {
        console.log("error",error)
        res.status(400).json({
          status: false,
          msg: error,
        });
      }
    }
  });
});

router.post("/refreshtoken", (req, res) => {
  var username = req.body.email;
  var refreshToken = req.body.refreshToken;
  if (
    refreshToken in refreshTokens &&
    refreshTokens[refreshToken] == username
  ) {
    User.get_user_by_username(username, async (err, user, result) => {
      //check wether user exists
      if (err) {
        res
          .status(500)
          .json({
            state: false,
            msg: "Something went wrong please try again!",
          });
      }

      if (!user) {
        res.status(404).json({ state: false, msg: "No user found" });
      }

      if (user) {
        const user_sel = {
          user_id: user[0].id,
          username: user[0].username,
          email:user[0].email,
        };
        var refreshtoken = randtoken.uid(256);
        refreshTokens[refreshtoken] = user[0].username;
        const token = jwt.sign(user_sel, secret, {
          //create jwt token for the authorized user
          expiresIn: 1800,
        });
        res.status(200).json({
          state: true,
          accesstoken: token,
          refreshToken: refreshtoken,
          user: user_sel,
        });
      }
    });
  } else {
    res.status(401).json({ state: false, msg: "Unaothorized User" });
  }
});

router.post(
  "/register",
  [
    check("username")
      .exists()
      .isString()
      .withMessage("isRequired"),
    check("email")
      .exists()
      .isEmail()
      .normalizeEmail()
      .withMessage("should be something like user@gmail.com"),
    check("password")
      .exists()
      .isLength({ min: 8 })
      .withMessage("Minimum 8 length"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    } else {
      User.get_user_by_username(req.body.username, (err, user_sel) => {
        if (Object.keys(user_sel).length == 0) {
          var user = {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
          };

          User.save_user(user, (err, user) => {
            if (!err) {
              res.status(200).json({
                status: true,
                msg: "Succesfully registered!",
              });
            } else {
              res
                .status(500)
                .json({
                  state: false,
                  msg: "Something went wrong please try again!",
                });
            }
          });
        } else {
          res.status(409).json({ state: false, msg: `user with ${req.body.username} already exsits` });
        }
      });
    }
  }
);



router.get(
  "/getbyid",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    var id = req.query.id;
    User.get_by_user_id(id, (err, user) => {
      if (!err) {
        res.status(200).json({
          status: true,
          msg: "Reading User by id",
          data: user,
        });
      } else {
        res.status(500).json({
          state: false,
          msg: "Something went wrong please try again!",
          data: JSON.stringify(err),
        });
      }
    });
  }
);

router.get(
  "/getbyusername",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    var username = req.query.user;
    
    User.get_user_by_username(username, (err, user) => {
      if (!err) {
        res.status(200).json({
          status: true,
          msg: "Reading User by id",
          data: user,
        });
      } else {
        res.status(500).json({
          state: false,
          msg: "Something went wrong please try again!",
          data: JSON.stringify(err),
        });
      }
    });
  }
);

router.post(
  "/changepassword",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const user_id = req.body.user;
    const password = req.body.password;
    const prvPassword = req.body.prvPassword;
    User.get_user_by_username(user_id, (erruser, user, result) => {
      if (erruser) {
        res.status(400).json({
          status: false,
          msg:  JSON.stringify(erruser) || "Something went wrong",
          data: JSON.stringify(erruser),
        });
      }

      if (user) {
        try {
          User.passwordCheck(
            prvPassword,
            user[0].password,
            function (err, match) {
              //check wether password is matching or not
              if (err) {
                res
                  .status(406)
                  .json({
                    state: false,
                    msg: "your prv Password is incorrect",
                  });
              }

              if (match) {
                User.change_password(password, user[0].id, (err, user) => {
                  if (err) {
                    throw err;
                  }

                  if (user) {
                    res
                      .status(200)
                      .json({ state: false, msg: "Successfully Updated" });
                  }
                });
              } else {
                res
                  .status(400)
                  .json({ state: false, msg: "password does not match" });
              }
            }
          );
        } catch (error) {
          res.status(400).json({
            status: false,
            msg: "Something went wrong",
            data: JSON.stringify(error),
          });
        }
      } else {
        res.status(400).json({
          state: false,
          msg: "No user found",
        });
      }
    });
  }
);

module.exports = router;
