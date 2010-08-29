logTailer
=========

Tail logs over HTTP, using node.


Configuration
-------------

On your server, modify the settings in <code>config.js</code> and then:

	node server.js

Or if you'd like it to run in the background behind <code>screen</code>:

	screen -d -m node server.js

To view the logs in your browser, copy the contents of the <code>web/</code> fodler to your web server, edit the config URLs inside <code>follow.htm</code> and then load it in a browser.

That's it.