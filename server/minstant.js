// DB publications
Meteor.publish("userData", function() {
  return Meteor.users.find({}, {fields: {"services": 0, "emails": 0}});
});

Meteor.publish("chats", function () {
  return Chats.find({$or:[
              {user1Id:this.userId},
              {user2Id:this.userId}
            ]});
})

// Add avatar URL to user profile uppon user creation
Accounts.onCreateUser(function(options, user) {
  console.log("Creating user "+user.username);
  user.profile = {};
  user.profile["avatar"] = Gravatar.imageUrl(user.emails[0].address);
  return user;
});

////
// METHODS
////
Meteor.methods({
  createChat: function (user1, user2) {
    if (!this.userId){
      throw new Meteor.Error("logged-out", "The user must be logged in to post a comment.");
    }

    // Check if users exist on the database
    if (Meteor.users.find({_id: user1}) && Meteor.users.find({_id: user2})) {
      console.log("Inserting a chat...")
      Chats.insert({user1Id:user1, user2Id:user2}, function(err, result){
        if (err) {return err;}
        else {
          console.log("Chat "+ result + " created!");
          return result;}
      });
    }
  }, //end of createChat

  updateMessages: function (chatId, messages) {
    Chats.update(chatId, messages);
  }
})
