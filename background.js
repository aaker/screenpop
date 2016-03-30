



// Conditionally initialize the options.
if (!localStorage.isInitialized) {
    localStorage.isActivated = true; // The display activation.
    localStorage.frequency = 1; // The display frequency, in minutes.
    localStorage.isInitialized = true; // The option initialization.
}

// Test for notification support.
if (window.Notification) {
    function initRegistration() {

        chrome.storage.sync.get({
            ns_server: '',
            ns_username: "",
            ns_password: ""
        }, function(items) {
            if (items.ns_server != "" && items.ns_username != "") {
                clearTimeout(myWaitTimeout);
                configuration = {
                    "clientName": "NetSapiens Chrome Extension", 
                    "clientId": "<CLINET_ID>",
                    "clientSecret": "<CLINET_SECRET>", 
                    "server": items.ns_server,
                    "logLevel": 1 // 0 or 1 
                }
                netsapiens.api = new netsapiens.Api(configuration);

                // Get credentials from user
                var user = items.ns_username; // '1000@domain.com' 
                var password = items.ns_password; // '1234'  

                // Request access token
                netsapiens.api.requestAccess(user, password);


                setTimeout(function() {
                    var mydevice = "sip:" + items.ns_username.replace("@", "c@");
                    var args = {
                        object: "device",
                        action: "read",
                        "uid": items.ns_username,
                        "device": mydevice,
                        "format": 'json'
                    };
                    netsapiens.api.post(args, function(device_read) {
                        console.log(device_read);
                        var ua_config = {
                            wsServers: ['wss://' + items.ns_server + ':9002'],
                            userAgentString: "SNAP Chrome Extension"
                        };

                        if (device_read[0]) {
                            ua_config.uri = device_read[0].aor;
                            ua_config.password = device_read[0].authentication_key;
                        } else {
                            var pass = generatePassword();
                            args = {
                                object: "device",
                                action: "create",
                                "uid": items.ns_username,
                                "device": mydevice,
                                "authentication_key": pass
                            };
                            netsapiens.api.post(args, function(device_read) {
                                ua_config.uri = mydevice;
                                ua_config.password = pass;
                            });
                        }


                        var userAgent = new SIP.UA(ua_config);
                        userAgent.on('invite', function(session) {
                            var name = session.remoteIdentity.displayName;
                            var number = session.remoteIdentity.uri.user;
                            localStorage.callid = session.request.call_id;
                            var id = session.startTime;
                            show(id, name, number);
                        });
                    });

                }, 1000);

            }


        });

    }
    myWaitTimeout = setInterval(initRegistration, 2000);
}

function show(notification_id, name, number) {
    chrome.storage.sync.get({
        ns_server: '',
        ns_username: "",
        ns_password: "",
        zd_server: '',
        zd_username: "",
        zd_password: ""
    }, function(items) {
        var userObject = null;
        var orgObject = null;
        var zendeskMesg = [];
        var iconUrl = "User.png";
        
        if (items.zd_server != "") //Zendesk integration enabled Do zendesk request then post notifications
        {
          $.ajax({
            type: "GET",
            url: "https://" + items.zd_server + "/api/v2/search.json?query=type:user+phone:" + number,
            dataType: 'json',
            async: false,
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', make_base_auth(items.zd_username, items.zd_password));
            },
            //data: 'query=type:user+phone:'+callerNumber,
            success: function(data) {

                if (data.count > 0) {
                    iconUrl = data.results[0].photo.content_url;

                    zendeskMesg.push({
                        title: "Name",
                        message: data.results[0].name
                    });
                    zendeskMesg.push({
                        title: "Company",
                        message: data.results[0].user_fields.organization
                    });
                    zendeskMesg.push({
                        title: "Email",
                        message: data.results[0].email
                    });
                    zendeskMesg.push({
                        title: "Time Zone",
                        message: data.results[0].time_zone
                    });
                    console.log(data.results[0].organization_id);

                    if (data.results[0].organization_id > 0) {
                        var urlZD = 'https://' + items.zd_server + '/agent/organizations/' + data.results[0].organization_id + '/tickets';
                        console.log(urlZD);
                        window.open(urlZD, '_blank');
                    }

                }

                if (Notification.permission !== "granted")
                    Notification.requestPermission();
                else {
                    chrome.notifications.create(notification_id, {
                        type: "list", 
                        iconUrl: iconUrl,
                        title: "Incoming Call",
                        message: name + " (" + number + ")",
                        items: zendeskMesg,
                        buttons: [{
                            title: "Answer",
                            iconUrl: "Check.png"
                        }, {
                            title: "Reject",
                            iconUrl: "Delete.png"
                        }]
                    }, function(id) {
                        myNotificationID = id;
                        tmpName = name;
                    });
                }

            }
        });
        }
        else
        {
          if (Notification.permission !== "granted")
              Notification.requestPermission();
          else {
              chrome.notifications.create(notification_id, {
                  type: "basic", 
                  iconUrl: iconUrl,
                  title: "Incoming Call",
                  message: name + " (" + number + ")",
                  buttons: [{
                      title: "Answer",
                      iconUrl: "Check.png"
                  }, {
                      title: "Reject",
                      iconUrl: "Delete.png"
                  }]
              }, function(id) {
                  myNotificationID = id;
                  tmpName = name;
              });
          }
        }
        
    });

}

chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
    if (notifId === myNotificationID) {


        chrome.notifications.clear(notifId, function() {});

        chrome.storage.sync.get({
            ns_server: '',
            ns_username: "",
            ns_password: ""
        }, function(items) {
            if (btnIdx === 0) {
                console.log("Answering");
                var mydevice = "sip:" + items.ns_username;
                var args = {
                    object: "call",
                    action: "answer",
                    "callid": localStorage.callid,
                    "uid": items.ns_username,
                    "destination": mydevice
                };
                netsapiens.api.post(args, function() {});



            } else if (btnIdx === 1) {
                console.log("Reject");
                var mydevice = "sip:" + items.ns_username;
                var args = {
                    object: "call",
                    action: "reject",
                    "callid": localStorage.callid,
                    "uid": items.ns_username
                };
                netsapiens.api.post(args, function() {});

            }
        });


    }
});

function generatePassword() {
        var length = 8,
            charset = "abcdefghijklnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            retVal = "";
        for (var i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    }

    function make_base_auth(user, password) {
        var tok = user + ':' + password;
        var hash = btoa(tok);
        return "Basic " + hash;
    }