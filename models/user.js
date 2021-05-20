var bcrypt = require("bcryptjs");
var sql = require("../config/db");

//get users by username
module.exports.get_user_by_username = (username, callback) => {
  sql.query("SELECT * FROM user WHERE username='" + username + "'", callback);
};


//get users by id
module.exports.get_by_user_id = (id,callback) =>{
  sql.query("SELECT id,username,email FROM user WHERE id='" + id + "'",callback)
}


//validate passwords
module.exports.passwordCheck = (plainpassword, hash, callback) => {
  
  bcrypt.compare(plainpassword, hash, (err, res) => {
    if (err) {
      throw err;
    } else {
      callback(null, res);
    }
  });
};

//change password
module.exports.change_password = (password, user_id, callback) => {
  bcrypt.hash(password, 10, (err, hash) => {
    password = hash;
    if (err) {
      throw err;
    } else {

      sql.query(
        "UPDATE user SET password = '" +
          password +
          "' WHERE id = '" +
          user_id +
          "'",
        callback
      );
    }
  });
};

//user save
module.exports.save_user = (user, callback) => {
  bcrypt.hash(user.password, 10, (err, hash) => {
    user.password = hash;
    if (err) {
      throw err;
    } else {
      sql.query("INSERT INTO user set ?", user, callback);
    }
  });
};