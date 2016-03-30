// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
  Grays out or [whatever the opposite of graying out is called] the option
  field.
*/
function ghost(isDeactivated) {
  options.style.color = isDeactivated ? 'graytext' : 'black';
}

window.addEventListener('load', function() {
  // Initialize the option controls.
  options.isActivated.checked = JSON.parse(localStorage.isActivated);
                                        
  if (!options.isActivated.checked) { ghost(true); }

  // Set the display activation and frequency.
  options.isActivated.onchange = function() {
    localStorage.isActivated = options.isActivated.checked;
    ghost(!options.isActivated.checked);

    
  };

  document.getElementById('save').addEventListener('click',
    save_options);

    restore_options()


  

});

function save_options() {
  var server = document.getElementById('server').value;
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  
  var zdserver = document.getElementById('zdserver').value;
  var zdusername = document.getElementById('zdusername').value;
  var zdpassword = document.getElementById('zdpassword').value;
  

  chrome.storage.sync.set({
    ns_server: server,
    ns_username: username,
    ns_password: password,
    zd_server: zdserver,
    zd_username: zdusername,
    zd_password: zdpassword
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    ns_server: '',
    ns_username: "",
    ns_password: "",
    zd_server: '',
    zd_username: "",
    zd_password: ""
  }, function(items) {
    document.getElementById('server').value = items.ns_server;
    document.getElementById('username').value = items.ns_username;
    document.getElementById('password').value = items.ns_password;
    document.getElementById('zdserver').value = items.zd_server;
    document.getElementById('zdusername').value = items.zd_username;
    document.getElementById('zdpassword').value = items.zd_password;
  });
}
