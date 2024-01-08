"use strict";

/**
 * Check if the key that is pressed is the Enter key.
 * @function
 * @param {Object} e - The event object.
 * @returns {bool} True if the key that is pressed is Enter key, false otherwise.
 * @listens input.onkeypress
 */
var keyCheck = function (e) {
  return e.keyCode === 13;
};

/**
 * Precompiled RegExp for matching space.
 * @const {RegExp}
 */
var space = /\s/g;

/**
 * Precompiled RegExp for unFuck1().
 * @const {RegExp}
 */
var reUnFuck1 = /\n(.+)/;

/**
 * Precompiled RegExp for unFuck2().
 * @const {RegExp}
 */
var reUnFuck2 = /.+(?=\n})/;

/**
 * Data storage for UnHex.
 * @var {Array.<string>}
 */
var unHexData = [];

/**
 * Parse data in unHex textarea and put it into unHexData.
 * @function
 * @listens button.onclick
 */
var unHexParse = function () {
  unHexData = [];
  try {
    eval("unHexData = " + $("#unHexTextarea").val());
    $("#unHexTextarea").val(JSON.stringify(unHexData));

    $("#unHexOutput").html("<p>Input successfully parsed.</p>");
  } catch (err) {
    $("#unHexOutput").html("<p>Could not parse input.</p>");
  }
};

/**
 * Find the index of the element that contains entered text.
 * @function
 * @listens button.onclick
 */
var unHexFind = function () {
  if (unHexData.length === 0) {
    $("#unHexOutput").html("<p>You must click Parse button first.</p>");
  } else {
    const str = $("#unHexValToIndex").val();
    $("#unHexOutput").html("");

    for (let i = 0; i < unHexData.length; i++) {
      try {
        if (unHexData[i].includes(str)) {
          $("#unHexOutput").append($("<p>").text(i.toString() + ": " + unHexData[i]));
        }
      } catch (err) {} // Ignore items that are not string
    }
  }
};

/**
 * Get value of the element at the entered index.
 * @function
 * @listens button.onclick
 */
var unHexGet = function () {
  if (unHexData.length === 0) {
    $("#unHexOutput").html("<p>You must click Parse button first.</p>");
    return;
  }

  let i = parseInt($("#unHexIndexToVal").val());
  if (isNaN(i) || !isFinite(i) || i < 0) {
    $("#unHexOutput").html("<p>That is not a valid index, please enter an integer.</p>");
    return;
  }
  if (i >= unHexData.length) {
    $("#unHexOutput").html("<p>Index out of range.</p>");
    return;
  }

  $("#unHexOutput").html($("<p>").text(unHexData[i]));
};

/**
 * Decompile JSFuck code, method 1.
 * The main logic is from nderscore of Code Golf.
 * @function
 * @listens button.onclick
 */
var unFuck1 = function () {
  const input = $("#unFuckInput").val().trim().replace(space, "");
  try {
    if (input.endsWith("()")) {
      // Remove outmost eval() wrapper
      $("#unFuckOutput").val(reUnFuck1.exec(eval(input.slice(0, -2)))[1].toString());
    } else {
      $("#unFuckOutput").val(eval(input).toString());
    }
  } catch (err) {
    $("#unFuckOutput").val("Failed, please try the other method. Error message:\n" + err);
  }
};

/**
 * Decompile JSFuck code, method 2.
 * The main logic is from nderscore of Code Golf.
 * @function
 * @listens button.onclick
 */
var unFuck2 = function () {
  const input = $("#unFuckInput").val().trim().replace(space, "");
  try {
    if (input.endsWith("()")) {
      $("#unFuckOutput").val(reUnFuck2.exec(eval(input.slice(0, -2))).toString());
    } else {
      $("#unFuckOutput").val(eval(input).toString());
    }
  } catch (err) {
    $("#unFuckOutput").val("Failed, please try the other method. Error message:\n" + err);
  }
};
