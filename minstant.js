Chats = new Mongo.Collection("chats");

if (Meteor.isClient) {
  // subscribe to the chats collection
  Meteor.subscribe("chats");
  Meteor.subscribe("userData");

  // Ask for username on sign up
  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_EMAIL'
  });

  // set up the main template the the router will use to build pages
  Router.configure({
    layoutTemplate: 'ApplicationLayout'
  });
  // specify the top level route, the page users see when they arrive at the site
  Router.route('/', function () {
    console.log("rendering root /");
    this.render("navbar", {to:"header"});
    this.render("lobby_page", {to:"main"});
  });

  // specify a route that allows the current user to chat to another users
  Router.route('/chat/:_id', function () {
    // the user they want to chat to has id equal to
    // the id sent in after /chat/...
    var otherUserId = this.params._id;
    // find a chat that has two users that match current user id
    // and the requested user id
    var filter = {$or:[
                {user1Id:Meteor.userId(), user2Id:otherUserId},
                {user2Id:Meteor.userId(), user1Id:otherUserId}
                ]};
    var chat = Chats.findOne(filter);
    if (!chat){// no chat matching the filter - need to insert a new one
      chatId = Meteor.call("createChat", Meteor.userId(), otherUserId);
    }
    else {// there is a chat going already - use that.
      chatId = chat._id;
    }
    if (chatId){// looking good, save the id to the session
      Session.set("chatId",chatId);
    }
    this.render("navbar", {to:"header"});
    this.render("chat_page", {to:"main"});
  });

  ///
  // helper functions
  ///
  Template.available_user_list.helpers({
    users:function(){
      return Meteor.users.find({});
    }
  })
 Template.available_user.helpers({
    getUsername:function(userId){
      user = Meteor.users.findOne({_id:userId});
      return user.username;
    },
    isMyUser:function(userId){
      if (userId == Meteor.userId()){
        return true;
      }
      else {
        return false;
      }
    }
  })


  Template.chat_page.helpers({
    messages:function(){
      var chat = Chats.findOne({_id:Session.get("chatId")});
      return chat.messages;
    },
    other_user:function(){
      return "";
    },

  })

  Template.chat_message.helpers({
    formatToken:function(){
      return 'MMM, D - H:m:s';
    }
  })

  Template.navbar.helpers({
    avatar:function(){
      return Meteor.user().profile.avatar;
    }
  })

  ///
  // EVENTS
  ///
 Template.chat_page.events({
  // this event fires when the user sends a message on the chat page
  'submit .js-send-chat':function(event){
    // stop the form from triggering a page reload
    event.preventDefault();
    // see if we can find a chat object in the database
    // to which we'll add the message
    var chat = Chats.findOne({_id:Session.get("chatId")});
    if (chat){// ok - we have a chat to use
      var msgs = chat.messages; // pull the messages property
      if (!msgs){// no messages yet, create a new array
        msgs = [];
      }
      // is a good idea to insert data straight from the form
      // (i.e. the user) into the database?? certainly not.
      // push adds the message to the end of the array
      msgs.push({user_avatar: Meteor.user().profile.avatar,
                text: event.target.chat.value,
                onDate: new Date()});
      // reset the form
      event.target.chat.value = "";
      // put the messages array onto the chat object
      chat.messages = msgs;
      // update the chat object in the database.
      Meteor.call("updateMessages", chat._id, chat);
    }
  }
 })
}

if (Meteor.isServer) {

  // Database publications
  Meteor.publish("userData", function() {
    return Meteor.users.find({}, {fields: {"services": 0, "emails": 0}});
  });

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
  }), //end of updateMessages

  // start up script that creates some users for testing
  // users have the username 'user1@test.com' .. 'user8@test.com'
  // and the password test123
  Meteor.startup(function () {
    if (!Meteor.users.findOne()){
      for (var i=1;i<9;i++){
        var email = "user"+i+"@test.com";
        var username = "user"+i;
        var avatar = "/ava"+i+".png"
        console.log("creating a user with password 'test123' and username/ email: "+email);
        Meteor.users.insert({username:username, profile:{avatar:avatar}, emails:[{address:email}],services:{ password:{"bcrypt" : "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"}}});
      }
    }
  }); // end of Meteor.startup
}
