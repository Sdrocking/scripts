/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2012 Siddhartha Dugar
 * 
 * Permission is hereby granted, free of charge, to any person obtaining copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to
 * do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This code was originally written for the addon "Better URL Bar"
 * 
 * Contributor: Siddhartha Dugar <dugar.siddhartha@gmail.com> (Creator)
 * 
 * ***** END LICENSE BLOCK *****
 */

"use strict";
Cu.import("resource://gre/modules/AddonManager.jsm");

var sss = Cc['@mozilla.org/content/style-sheet-service;1']
		.getService(Ci.nsIStyleSheetService);
var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);

// Default name to be used until name is initialized
var ADDON_NAME = "myAddon";

function initAddonNameAsync(data) {
	AddonManager.getAddonByID(data.id, function(addon) {
		ADDON_NAME = addon.name;
		printToLog("ADDON_NAME initialized.");
	});
}

/**
 * Prints message in the Error Console if logging is enabled or forced
 * 
 * @param forceEnable
 *            boolean argument to force logging
 */
function printToLog(message, forceEnable) {
	forceEnable = forceEnable || false;
	if (forceEnable || prefValue("loggingEnabled")) {
		Services.console.logStringMessage(ADDON_NAME + ": " + message);
	}
}

/**
 * @param filepath
 *            the relative path of the file
 * @returns the absolute URI corresponding to the the file
 */
function getURIForFile(filepath) {
	return ios.newURI(__SCRIPT_URI_SPEC__.replace("bootstrap.js", filepath),
			null, null);
}

/**
 * Load the stylesheet located at the relative location filepath
 */
function loadSheet(filepath) {
	if (filepath == null)
		return;

	var uri = getURIForFile(filepath);
	if (!sss.sheetRegistered(uri, sss.USER_SHEET)) {
		sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
		printToLog("Loaded " + filepath);
	}
}

/**
 * Unload the stylesheet located at the relative location filepath
 */
function unloadSheet(filepath) {
	if (filepath == null)
		return;

	var uri = getURIForFile(filepath);
	if (sss.sheetRegistered(uri, sss.USER_SHEET)) {
		sss.unregisterSheet(uri, sss.USER_SHEET);
		printToLog("Unloaded " + filepath);
	}
}

/**
 * Loads fileName if prefName is enabled and remembers to unload when the addon
 * is shutdown. Adds an observer to load/unload fileName when prefName is
 * changed. Calls callback only when the specified pref changes value.
 * 
 * @deprecated Style-sheets should not be loaded/unloaded based on pref values.
 */
function loadAndObserve(prefName, fileName, callback) {
	if (prefValue(prefName) === true) {
		loadSheet(fileName);
	}

	prefObserve([ prefName ], function() {
		var value = prefValue(prefName);
		value ? loadSheet(fileName) : unloadSheet(fileName);
		callback();
	});

	unload(function() {
		unloadSheet(fileName);
	});
}

function setAttrDoCallback(element, attrName, value, callback) {
	element.setAttribute(attrName, value);
	printToLog(attrName + " <- " + value);
	if (callback) {
		callback();
	}
}

function removeAttrDoCallback(element, attrName, callback) {
	element.removeAttribute(attrName);
	printToLog(attrName + " removed.");
	if (callback) {
		callback();
	}
}

/**
 * Sets the attribute attrName on the elementId element at the value returned by
 * getValue(), or the value of obsPref. Keeps the value of attrName in sync with
 * the value of obsPref. Fires onSet/onRemove when the value of obsPref changes.
 * 
 * @param obsPref
 *            Name of the preference that the attribute will follow.
 * @param elementId
 *            Id of the element that the attribute will be set on.
 * @param attrName
 *            Name of the attribute that will be set
 * @param onSet
 *            Callback to be fired after the attribute is set.
 * @param onRemove
 *            Callback to be fired after the attribute is removed.
 * @param getValue
 *            Callback to get the value from
 */
function loadObsPrefWCallback(obsPref, elementId, attrName, onSet, onRemove,
		getValue) {
	if (obsPref == null || elementId == null) {
		return;
	}

	if (!attrName || attrName.length === 0) {
		attrName = obsPref;
	}

	watchWindows(function(window) {
		if (!window) {
			return;
		}

		var element = window.document.getElementById(elementId);
		if (element) {
			var value = getValue ? getValue() : prefValue(obsPref);
			setAttrDoCallback(element, attrName, value, onSet);

			prefObserve([ obsPref ], function() {
				value = getValue ? getValue() : prefValue(obsPref);
				setAttrDoCallback(element, attrName, value, onSet);
			});

			unload(function() {
				removeAttrDoCallback(element, attrName, onRemove);
			});
		}
	});
}
