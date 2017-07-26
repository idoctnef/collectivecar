//File: controllers/userController.js
var mongoose = require('mongoose');
var adminModel = mongoose.model('adminModel');
var userModel = mongoose.model('userModel');
var travelModel = mongoose.model('travelModel');

var config = require('../config');
var pageSize = config.pageSize;

/* */
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var express = require("express");
var app = express();
var config = require('../config'); // get our config file
app.set('superSecret', config.secret); // secret variable

var crypto = require('crypto');
/* */

var request = require('request');


//POST - Insert a new User in the DB
exports.signup = function(req, res) {
    //get random avatar
    var r = getRand(1, 10);
    randAvatar = getAvatar(r);


    var user = new userModel({
        username: req.body.username,
        password: crypto.createHash('sha256').update(req.body.password).digest('base64'),
        description: req.body.description,
        avatar: randAvatar,
        email: req.body.email,
        phone: req.body.phone,
        telegram: req.body.telegram
    });
    if (user.username == undefined) {
        return res.status(500).jsonp("empty inputs");
    } else if (user.password == undefined) {
        return res.status(500).jsonp("empty inputs");
    } else if (user.email == undefined) {
        return res.status(500).jsonp("empty inputs");
    }

    user.save(function(err, user) {
        if (err) return res.send(500, err.message);

        exports.login(req, res);
    });
};


//POST - auth user
exports.login = function(req, res) {
    // find the user
    adminModel.findOne({
            username: req.body.username
        })
        .select('+password')
        .exec(function(err, user) {

            if (err) throw err;

            if (!user) {
                res.json({
                    success: false,
                    message: 'Authentication failed. User not found.'
                });
            } else if (user) {

                req.body.password = crypto.createHash('sha256').update(req.body.password).digest('base64');

                // check if password matches
                if (user.password != req.body.password) {
                    res.json({
                        success: false,
                        message: 'Authentication failed. Wrong password.'
                    });
                } else {

                    // if user is found and password is right
                    // create a token
                    var token = jwt.sign({
                        foo: 'bar'
                    }, app.get('superSecret'), {
                        //expiresInMinutes: 1440 // expires in 24 hours
                        //expiresIn: '60m'
                    });
                    user.token = token;
                    user.save(function(err, user) {
                        if (err) return res.send(500, err.message);
                        //res.status(200).jsonp(travel);
                        console.log(user);
                        // return the information including token as JSON
                        user.password = "";
                        res.json({
                            success: true,
                            message: 'Enjoy your token!',
                            token: token,
                            user: user
                        });
                    });

                }

            }

        });
};
exports.changePassword = function(req, res) {
    //if(req.body.)
    userModel.update({
            'token': req.headers['x-access-token']
        }, req.body,
        function(err) {
            if (err) return console.log(err);
            exports.getUserByToken(req, res);
        });
};

function isNodeInNodes(node, nodes){
    for (var i=0; i<nodes.length; i++){
        if (node.title==nodes[i].title){
            return(i);
        }
    }
    return(-1);
}
exports.network = function(req, res) {
    userModel.find()
        .limit(pageSize)
        .skip(pageSize * Number(req.query.page))
        .lean()
        //.populate({path: 'travels', populate: {path: 'joins', populate: {path: 'username'}}})
        .populate('travels', 'title type joins')
        .populate('likes', 'username avatar')
        .exec(function(err, users) {
            if (err) return res.send(500, err.message);

            /*res.status(200).jsonp(users);*/
            var nodes=[];
            var edges=[];
            for (var i=0; i<users.length; i++){
                var node = {
                    title: users[i].username,
                    label: users[i].username,
                    image: users[i].avatar,
                    shape: "image",
                    id: users[i]._id,
                    group: users[i]._id
                };
                var lNode = isNodeInNodes(node, nodes);
                if (lNode<0){
                    nodes.push(node);
                    var uNode = nodes.length -1;
                }
                for(var j=0; j<users[i].likes.length; j++){
                    /*console.log(i + ", " + j);
                    console.log(nodes);*/
                    var node = {
                        title: users[i].likes[j].username,
                        label: users[i].likes[j].username,
                        image: users[i].likes[j].avatar,
                        shape: "image",
                        id: users[i].likes[j]._id
                    };
                    var lNode = isNodeInNodes(node, nodes);
                    if (lNode<0){
                        //node no exist
                        nodes.push(node);
                        lNode = nodes.length -1;
                    }else{
                        //node already exist

                    }
                    var edge={
                        from: users[i]._id,
                        to: users[i].likes[j]._id,
                        arrows: "to",
                        color: {
                            color: "#E57373"//red300
                        }
                    };
                    edges.push(edge);
                }
                for(var j=0; j<users[i].travels.length; j++){
                    /*console.log(i + ", " + j);
                    console.log(nodes);*/
                    var node = {
                        title: users[i].travels[j].title,
                        label: users[i].travels[j].title,
                        image: "img/" + users[i].travels[j].type + ".png",
                        shape: "image",
                        id: users[i].travels[j]._id,
                        value: "0.5",
                        group: users[i]._id
                    };
                    var lNode = isNodeInNodes(node, nodes);
                    if (lNode<0){
                        //node no exist
                        nodes.push(node);
                        lNode = nodes.length -1;
                    }else{
                        //node already exist

                    }
                    var edge={
                        from: users[i]._id,
                        to: users[i].travels[j]._id
                    };
                    edges.push(edge);

                    //users joining travels
                    /*for(var k=0; k<users[i].travels[j].joins.length; k++){
                        var node = {
                            title: users[i].travels[j].joins[k].username,
                            label: users[i].travels[j].joins[k].username,
                            image: users[i].travels[j].joins[k].avatar,
                            shape: "image",
                            id: users[i].travels[j].joins[k]._id
                        };
                        var lNode = isNodeInNodes(node, nodes);
                        if (lNode<0){
                            //node no exist
                            nodes.push(node);
                            lNode = nodes.length -1;
                        }
                        var edge={
                            from: users[i].travels[j].joins[k]._id,
                            to: users[i].travels[j]._id,
                            color: {
                                color: "#4DD0E1"//cyan300
                            }
                        };
                        edges.push(edge);
                    }*/
                }

            }
            var resp = {
                nodes: nodes,
                edges: edges
            };
            res.status(200).jsonp(resp);
        });
};
