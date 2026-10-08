/*======================================================================*\
|| #################################################################### ||
|| # vBulletin 4.0.1
|| # ---------------------------------------------------------------- # ||
|| # Copyright ©2000-2010 vBulletin Solutions Inc. All Rights Reserved. ||
|| # This file may not be redistributed in whole or significant part. # ||
|| # ---------------- VBULLETIN IS NOT FREE SOFTWARE ---------------- # ||
|| # http://www.vbulletin.com | http://www.vbulletin.com/license.html # ||
|| #################################################################### ||
\*======================================================================*/
custom_editor_events = {
    editor_switch: new YAHOO.util.CustomEvent("editor_switch"),
    editor_resize: new YAHOO.util.CustomEvent("editor_resize")
};

     
function vB_Text_Editor(A, G, B, D, C, F, E) {
     this._construct(A, G, B, D, C, F, E);
     this.init(C)
 }
 
vB_Text_Editor.prototype._construct = function (A, G, B, D, C, F, E) {
    //only wysiwyg for fireox
   // is_firefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    
    
    is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    if(is_chrome){
            is_moz = 1 ;
    }	

    this.editorid = A;
    this.wysiwyg_mode = parseInt(G, 10) ? 1 : 0;
     
    //disable wysiwyg for all browsers except firefox
    //if(this.wysiwyg_mode && !is_firefox)
    //	this.wysiwyg_mode = 0;

    this.initialized = false;
    this.parsetype = (typeof B == "undefined" ? "nonforum" : B);
    this.ajax_extra = (typeof E == "undefined" ? "" : E);
    this.parsesmilies = (typeof D == "undefined" ? 1 : D);
    this.popupmode = (true);
    this.controlbar = fetch_object(this.editorid + "_controls");
    this.textobj = fetch_object(this.editorid + "_textarea");
    this.buttons = new Array();
    this.popups = new Array();
    this.prompt_popup = null;
    this.fontstate = null;
    this.sizestate = null;
    this.colorstate = null;
    this.clipboard = "";
    this.disabled = false;
    this.history = new vB_History();
    this.influx = 0;
    this.allowbasicbbcode = ((typeof allowbasicbbcode != "undefined" && allowbasicbbcode) ? true : false);
    /*this.ltr = ((typeof ltr != "undefined" && ltr == "right") ? "right" : "left");*/
    this.ltr = "right" ;
    this.activeimg = null
    this.content = E ;
};

vB_Text_Editor.prototype.add_range = function (B) {
    this.check_focus();
    var C = this.editwin.getSelection();
    var A = this.editdoc.createRange();
    A.selectNodeContents(B);
    C.removeAllRanges();
    C.addRange(A)
};
vB_Text_Editor.prototype.apply_format = function (D, A, B) {
    if (this.wysiwyg_mode) {
        if (is_moz) {
            this.editdoc.execCommand("useCSS", false, true)
        }
        this.editdoc.execCommand(D, (typeof A == "undefined" ? false : A), (typeof B == "undefined" ? true : B));
        return false
    } else {
        switch (D) {
        case "bold":
        case "italic":
        case "underline":
            this.wrap_tags(D.substr(0, 1), false);
            return;
        case "justifyleft":
        case "justifycenter":
        case "justifyright":
            this.wrap_tags(D.substr(7), false);
            return;
        case "indent":
            this.wrap_tags(D, false);
            return;
        case "fontname":
            this.wrap_tags("font", B);
            return;
        case "fontsize":
            this.wrap_tags("size", B);
            return;
        case "forecolor":
            this.wrap_tags("color", B);
            return;
        case "createlink":
            var C = this.get_selection();
            if (C) {
                this.wrap_tags("url", B)
            } else {
                this.wrap_tags("url", B, B)
            }
            return;
        case "insertimage":
            this.wrap_tags("img", false, B);
            return;
        case "removeformat":
            return
        }
    }
};
vB_Text_Editor.prototype.build_attachments_popup = function (E) {
    var G, F, D = 0;
    var B = YAHOO.util.Dom.get(vB_Attachments.listobjid);
    if (B) {
        var A = B.getElementsByTagName("li");
        var C = A[1].nextSibling;
        while (C) {
            C.editorid = this.editorid;
            if (!YAHOO.util.Event.getListeners(C, "mouseover")) {
                YAHOO.util.Event.on(C, "mouseover", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C, "mouseout", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C, "mouseup", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C, "mousedown", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C, "click", vB_Text_Editor_Events.prototype.attachoption_onclick)
            }
            C = C.nextSibling;
            D++
        }
    } else {
        return
    } if (D > 1) {
        F = document.createElement("div");
        F.editorid = this.editorid;
        F.controlkey = E.id;
        F.className = "osmilie";
        F.style.fontWeight = "bold";
        F.style.paddingLeft = "25px";
        F.style.whiteSpace = "nowrap";
        F.innerHTML = vbphrase.insert_all;
        F.onmouseover = F.onmouseout = F.onmousedown = F.onmouseup = vB_Text_Editor_Events.prototype.menuoption_onmouseevent;
        F.onclick = vB_Text_Editor_Events.prototype.attachinsertall_onclick
    }
};
vB_Text_Editor.prototype.build_fontname_popup = function (B) {
    if (!YAHOO.util.Event.getListeners(B, "mouseover")) {
        YAHOO.util.Event.on(B, "mouseover", vB_Text_Editor.prototype.menu_context, B, this);
        YAHOO.util.Event.on(B, "mouseout", vB_Text_Editor.prototype.menu_context, B, this);
        YAHOO.util.Event.on(B, "mouseup", vB_Text_Editor.prototype.menu_context, B, this);
        YAHOO.util.Event.on(B, "mousedown", vB_Text_Editor.prototype.menu_context, B, this);
        if (YAHOO.util.Dom.get(this.editorid + "_fontfield")) {
            this.fontoptions = {
                "": YAHOO.util.Dom.get(this.editorid + "_fontfield").innerHTML
            }
        }
        var C = YAHOO.util.Dom.getElementsByClassName("fontname", "", B);
        for (i = 0; i < C.length; i++) {
            C[i].cmd = B.cmd;
            C[i].controlkey = B.id;
            C[i].editorid = this.editorid;
            YAHOO.util.Event.on(C[i], "mouseover", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "mouseout", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "mouseup", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "mousedown", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "click", vB_Text_Editor_Events.prototype.formatting_option_onclick_font);
            var A = C[i].firstChild.innerHTML;
            this.fontoptions[A] = A
        }
    }
};
vB_Text_Editor.prototype.build_fontsize_popup = function (B) {
    if (!YAHOO.util.Event.getListeners(B, "mouseover")) {
        YAHOO.util.Event.on(B, "mouseover", vB_Text_Editor.prototype.menu_context, B, this);
        YAHOO.util.Event.on(B, "mouseout", vB_Text_Editor.prototype.menu_context, B, this);
        YAHOO.util.Event.on(B, "mouseup", vB_Text_Editor.prototype.menu_context, B, this);
        YAHOO.util.Event.on(B, "mousedown", vB_Text_Editor.prototype.menu_context, B, this);
        if (YAHOO.util.Dom.get(this.editorid + "_sizefield")) {
            this.sizeoptions = {
                "": YAHOO.util.Dom.get(this.editorid + "_sizefield").innerHTML
            }
        }
        var C = YAHOO.util.Dom.getElementsByClassName("fontsize", "", B);
        for (i = 0; i < C.length; i++) {
            C[i].cmd = B.cmd;
            C[i].controlkey = B.id;
            C[i].editorid = this.editorid;
            YAHOO.util.Event.on(C[i], "mouseover", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "mouseout", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "mouseup", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "mousedown", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
            YAHOO.util.Event.on(C[i], "click", vB_Text_Editor_Events.prototype.formatting_option_onclick_size);
            var A = C[i].firstChild.firstChild.innerHTML;
            this.sizeoptions[A] = A
        }
    }
};
vB_Text_Editor.prototype.build_forecolor_popup = function (C) {
    if (!YAHOO.util.Event.getListeners(C, "mouseover")) {
        YAHOO.util.Event.on(C, "mouseover", vB_Text_Editor.prototype.menu_context, C, this);
        YAHOO.util.Event.on(C, "mouseout", vB_Text_Editor.prototype.menu_context, C, this);
        YAHOO.util.Event.on(C, "mouseup", vB_Text_Editor.prototype.menu_context, C, this);
        YAHOO.util.Event.on(C, "mousedown", vB_Text_Editor.prototype.menu_context, C, this);
        var B = YAHOO.util.Dom.getElementsByClassName("colorbutton", "", C);
        if (B.length) {
            for (var A = 0; A < B.length; A++) {
                B[A].cmd = C.cmd;
                B[A].editorid = this.editorid;
                B[A].controlkey = C.id;
                B[A].colorname = YAHOO.util.Dom.getStyle(B[A].firstChild, "background-color");
                B[A].id = this.editorid + "_color_" + this.translate_color_commandvalue(B[A].colorname);
                YAHOO.util.Event.on(B[A], "mouseover", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(B[A], "mouseout", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(B[A], "mouseup", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(B[A], "mousedown", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(B[A], "click", vB_Text_Editor_Events.prototype.coloroption_onclick)
            }
        }
    }
};
vB_Text_Editor.prototype.build_smilie_popup = function (D) {
    if (!YAHOO.util.Event.getListeners(D, "mouseover")) {
        YAHOO.util.Event.on(D, "mouseover", vB_Text_Editor.prototype.menu_context, D, this);
        YAHOO.util.Event.on(D, "mouseout", vB_Text_Editor.prototype.menu_context, D, this);
        YAHOO.util.Event.on(D, "mouseup", vB_Text_Editor.prototype.menu_context, D, this);
        YAHOO.util.Event.on(D, "mousedown", vB_Text_Editor.prototype.menu_context, D, this);
        var C = YAHOO.util.Dom.getElementsByClassName("smilie", "", D);
        if (C.length) {
            for (var A = 0; A < C.length; A++) {
                var E = YAHOO.util.Dom.get("moresmilies");
                if (E) {
                    YAHOO.util.Dom.setStyle(E, "cursor", pointer_cursor);
                    E.editorid = this.editorid;
                    E.controlkey = D.id;
                    YAHOO.util.Event.on(E, "click", vB_Text_Editor_Events.prototype.smiliemore_onclick)
                }
                C[A].editorid = this.editorid;
                C[A].controlkey = D.id;
                C[A].smilietext = C[A].firstChild.firstChild.alt;
                var B = C[A].id.match(/^smilie_dropdown_([0-9]+)$/);
                C[A].smilieid = B[1];
                YAHOO.util.Event.on(C[A], "mouseover", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C[A], "mouseout", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C[A], "mouseup", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C[A], "mousedown", vB_Text_Editor_Events.prototype.menuoption_onmouseevent);
                YAHOO.util.Event.on(C[A], "click", vB_Text_Editor_Events.prototype.smilieoption_onclick)
            }
        }
    }
};
vB_Text_Editor.prototype.build_select = function (F) {
    var E = document.createElement("select");
    E.id = this.editorid + "_select_" + F.cmd;
    E.editorid = this.editorid;
    E.cmd = F.cmd;
    var D = document.createElement("option");
    D.value = "";
    D.text = F.title;
    E.add(D, is_ie ? E.options.length : null);
    D = document.createElement("option");
    D.value = "";
    D.text = " ";
    E.add(D, is_ie ? E.options.length : null);
    var C;
    switch (F.cmd) {
    case "fontname":
        for (C = 0; C < fontoptions.length; C++) {
            D = document.createElement("option");
            D.value = fontoptions[C];
            D.text = (fontoptions[C].length > 10 ? (fontoptions[C].substr(0, 10) + "...") : fontoptions[C]);
            E.add(D, is_ie ? E.options.length : null)
        }
        E.onchange = vB_Text_Editor_Events.prototype.formatting_select_onchange;
        break;
    case "fontsize":
        for (C = 0; C < sizeoptions.length; C++) {
            D = document.createElement("option");
            D.value = sizeoptions[C];
            D.text = sizeoptions[C];
            E.add(D, is_ie ? E.options.length : null)
        }
        E.onchange = vB_Text_Editor_Events.prototype.formatting_select_onchange;
        break;
    case "forecolor":
        for (C in coloroptions) {
            if (YAHOO.lang.hasOwnProperty(coloroptions, C)) {
                D = document.createElement("option");
                D.value = coloroptions[C];
                D.text = PHP.trim((coloroptions[C].length > 5 ? (coloroptions[C].substr(0, 5) + "...") : coloroptions[C]).replace(new RegExp("([A-Z])", "g"), " $1"));
                D.style.backgroundColor = C;
                E.add(D, is_ie ? E.options.length : null)
            }
        }
        E.onchange = vB_Text_Editor_Events.prototype.formatting_select_onchange;
        break;
    case "smilie":
        for (var A in smilieoptions) {
            if (!YAHOO.lang.hasOwnProperty(smilieoptions, A)) {
                continue
            }
            for (var B in smilieoptions[A]) {
                if (!YAHOO.lang.hasOwnProperty(smilieoptions[A], B)) {
                    continue
                }
                if (B != "more") {
                    D = document.createElement("option");
                    D.value = smilieoptions[A][B][1];
                    D.text = smilieoptions[A][B][1];
                    D.smilieid = B;
                    D.smiliepath = smilieoptions[A][B][0];
                    D.smilietitle = smilieoptions[A][B][2];
                    E.add(D, is_ie ? E.options.length : null)
                }
            }
        }
        E.onchange = vB_Text_Editor_Events.prototype.smilieselect_onchange;
        break;
    case "attach":
        E.onmouseover = vB_Text_Editor_Events.prototype.attachselect_onmouseover;
        E.onchange = vB_Text_Editor_Events.prototype.attachselect_onchange;
        break
    }
    while (F.hasChildNodes()) {
        F.removeChild(F.firstChild)
    }
    this.buttons[F.cmd] = F.appendChild(E)
};
vB_Text_Editor.prototype.button_context = function (C, B, A) {
    if (this.disabled) {
        return
    }
    if (typeof A == "undefined") {
        A = "button"
    }
    if (YAHOO.util.Dom.hasClass(C, "imagebutton_disabled")) {
        return
    }
    switch (C.state) {
    case true:
        switch (B) {
        case "mouseover":
        case "mousedown":
        case "mouseup":
            this.set_control_style(C, A, "down");
            break;
        case "mouseout":
            this.set_control_style(C, A, "selected");
            break
        }
        break;
    default:
        switch (B) {
        case "mouseover":
        case "mouseup":
            this.set_control_style(C, A, "hover");
            break;
        case "mousedown":
            this.set_control_style(C, A, "down");
            break;
        case "mouseout":
            this.set_control_style(C, A, "normal");
            break
        }
        break
    }
};
vB_Text_Editor.prototype.setbookmark = function () {
    var B = this.wysiwyg_mode ? this.editdoc.selection : document.selection;
    if (is_ie && (B.type == "Text" || B.type == "None")) {
        var A = B.createRange();
        this.bookmark = A.getBookmark()
    }
};
vB_Text_Editor.prototype.restorebookmark = function () {
    if (is_ie && this.bookmark) {
        var E = this.wysiwyg_mode ? this.editdoc : document;
        var B = E.body.createTextRange();
        B.moveToBookmark(this.bookmark);
        if (!this.wysiwyg_mode && B.parentElement().id != this.editorid + "_textarea") {
            var A = document.selection.createRange();
            var F = A.duplicate();
            F.moveToElementText(this.editdoc);
            if (F.text.length > 0) {
                var D = F.text.length;
                var C = F.text.match(/\r/g);
                if (C) {
                    D = D - C.length
                }
                F.moveStart("character", D);
                F.collapse();
                F.select()
            }
        } else {
            B.select()
        }
        this.bookmark = null
    }
};
vB_Text_Editor.prototype.check_focus = function () {
    if (!this.editwin.hasfocus || (is_moz && is_mac)) {
        this.editwin.focus();
        this.restorebookmark();
        if (is_opera) {
            this.editwin.focus()
        }
    }
};
vB_Text_Editor.prototype.collapse_selection_end = function () {
    var range;
    if (this.editdoc.selection) {
        range = this.editdoc.selection.createRange();
        eval("range.move('character', -1);");
        range.collapse(false);
        range.select()
    } else {
        if (document.selection && document.selection.createRange) {
            range = document.selection.createRange();
            range.collapse(false);
            range.select()
        } else {
            if (typeof (this.editdoc.selectionStart) != "undefined") {
                var sel_text = this.editdoc.value.substr(this.editdoc.selectionStart, this.editdoc.selectionEnd - this.editdoc.selectionStart);
                this.editdoc.selectionStart = this.editdoc.selectionStart + sel_text.vBlength()
            } else {
                if (window.getSelection) {}
            }
        }
    }
};
vB_Text_Editor.prototype.createlink_wysiwyg = function (B, A) {
    return this.apply_format("createlink", is_ie, (typeof A == "undefined" ? true : A))
};
vB_Text_Editor.prototype.createlink = function (B, A) {
    if (this.wysiwyg_mode) {
        if (is_moz || is_opera) {
            if (typeof A == "undefined") {
                A = this.show_prompt(vbphrase.enter_link_url, "http://", true)
            }
            if ((A = this.verify_prompt(A)) !== false) {
                if (this.get_selection()) {
                    this.apply_format("unlink");
                    this.createlink_wysiwyg(B, A)
                } else {
                    this.insert_text('<a href="' + A + '">' + A + "</a>")
                }
            }
            return true
        } else {
            return this.createlink_wysiwyg(B, A)
        }
    } else {
        this.prompt_link("url", A, vbphrase.enter_link_url, "http://")
    }
};
vB_Text_Editor.prototype.destroy = function () {
    var A;
    for (A in this.buttons) {
        if (YAHOO.lang.hasOwnProperty(this.buttons, A)) {
            this.set_control_style(this.buttons[A], "button", "normal")
        }
    }
    YAHOO.util.Event.removeListener(this.editdoc, "mousemove", vB_Text_Editor_Events.prototype.editdoc_onmousemove);
    YAHOO.util.Event.removeListener(this.editdoc, "click", vB_Text_Editor_Events.prototype.editdoc_onclick);
    YAHOO.util.Event.removeListener(this.editdoc, "mousedown", vB_Text_Editor_Events.prototype.editdoc_onmousedown);
    YAHOO.vBulletin.vBPopupMenu.close_all();
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.disable_editor = function (C) {
    if (this.wysiwyg_mode) {
        if (!this.disabled) {
            this.disabled = true;
            var B = fetch_object(this.editorid + "_hider");
            if (B) {
                B.parentNode.removeChild(B)
            }
            var D = document.createElement("div");
            D.id = this.editorid + "_hider";
            D.className = "wysiwyg textbox hider";
            D.style.width = this.editbox.style.width;
            D.style.height = this.editbox.style.height;
            var A = document.createElement("div");
            A.style.padding = "8px";
            A.innerHTML = C;
            D.appendChild(A);
            this.editbox.parentNode.appendChild(D);
            this.editbox.style.display = "none"
        }
    } else {
        if (!this.disabled) {
            this.disabled = true;
            if (typeof C != "undefined") {
                this.editbox.value = C
            }
            this.editbox.disabled = true
        }
    }
};
vB_Text_Editor.prototype.email = function (C, A) {
    if (this.wysiwyg_mode) {
        if (typeof A == "undefined") {
            A = this.show_prompt(vbphrase.enter_email_link, "", true)
        }
        A = this.verify_prompt(A);
        if (A === false) {
            return this.apply_format("unlink")
        } else {
            var B = this.get_selection();
            return this.insert_text('<a href="mailto:' + A + '">' + (B ? B : A) + "</a>", (B ? true : false))
        }
    } else {
        this.prompt_link("email", A, vbphrase.enter_email_link, "")
    }
};
vB_Text_Editor.prototype.enable_editor = function (B) {
    if (this.wysiwyg_mode) {
        if (typeof B != "undefined") {
            this.set_editor_contents(B)
        }
        this.editbox.style.display = "";
        var A = fetch_object(this.editorid + "_hider");
        if (A) {
            A.parentNode.removeChild(A)
        }
        this.disabled = false
    } else {
        if (typeof B != "undefined") {
            this.editbox.value = B
        }
        this.editbox.disabled = false;
        this.disabled = false
    }
};
vB_Text_Editor.prototype.format = function (D, C, A) {
    D = do_an_e(D);
    if (this.disabled) {
        return false
    }
    if (C != "redo") {
        this.history.add_snapshot(this.get_editor_contents())
    }
    if (C == "switchmode") {
        switch_editor_mode(this.editorid);
        return
    } else {
        if (C.substr(0, 6) == "resize") {
            var F = parseInt(C.substr(9), 10);
            var E = parseInt(C.substr(7, 1), 10) == "1" ? 1 : -1;
            this.resize_editor(F * E);
            return
        }
    }
    this.check_focus();
    var B;
    if (C.substr(0, 4) == "wrap") {
        B = this.wrap_tags(C.substr(6), (C.substr(4, 1) == "1" ? true : false))
    } else {
        if (this[C]) {
            if (A === false) {
                B = this[C](D)
            } else {
                B = this[C](D, A)
            }
        } else {
            try {
                B = this.apply_format(C, false, (typeof A == "undefined" ? true : A))
            } catch (D) {
                this.handle_error(C, D);
                B = false
            }
        }
    } if (C != "undo") {
        this.history.add_snapshot(this.get_editor_contents())
    }
    this.set_context(C);
    this.check_focus();
    return B
};
vB_Text_Editor.prototype.get_editor_contents = function () {
    if (this.wysiwyg_mode) {
        return this.editdoc.body.innerHTML
    } else {
        return this.editdoc.value
    }
};
vB_Text_Editor.prototype.get_selection = function () {
    if (this.wysiwyg_mode) {
        if (is_moz) {
            selection = this.editwin.getSelection();
            this.check_focus();
            var A = selection ? selection.getRangeAt(0) : this.editdoc.createRange();
            return this.read_nodes(A.cloneContents(), false)
        } else {
            if (is_opera) {
                selection = this.editwin.getSelection();
                this.check_focus();
                A = selection ? selection.getRangeAt(0) : this.editdoc.createRange();
                var C = document.implementation.createLSSerializer();
                return C.writeToString(A.cloneContents())
            } else {
                var A = this.editdoc.selection.createRange();
                if (A.htmlText && A.text) {
                    return A.htmlText
                } else {
                    var D = "";
                    for (var B = 0; B < A.length; B++) {
                        D += A.item(B).outerHTML
                    }
                    return D
                }
            }
        }
    } else {
        if (typeof (this.editdoc.selectionStart) != "undefined") {
            return this.editdoc.value.substr(this.editdoc.selectionStart, this.editdoc.selectionEnd - this.editdoc.selectionStart)
        } else {
            if (document.selection && document.selection.createRange) {
                return document.selection.createRange().text
            } else {
                if (window.getSelection) {
                    return window.getSelection() + ""
                } else {
                    return false
                }
            }
        }
    }
};
vB_Text_Editor.prototype.handle_error = function (A, B) {};
vB_Text_Editor.prototype.init = function (A) {
    if (this.initialized) {
        return
    }
    this.textobj.disabled = false;
    if (this.tempiframe) {
        this.tempiframe.parentNode.removeChild(this.tempiframe)
    }
    this.set_editor_contents(A);
    this.set_editor_functions();
    this.init_controls();
    this.init_smilies(fetch_object(this.editorid + "_smiliebox"));
    if (typeof smilie_window != "undefined" && !smilie_window.closed) {
        this.init_smilies(smilie_window.document.getElementById("smilietable"))
    }
    this.captcha = document.getElementById("imagestamp");
    if (this.captcha != null) {
        this.captcha.setAttribute("tabIndex", 1)
    }
    this.initialized = true
};
vB_Text_Editor.prototype.init_command_button = function (A) {
    A.cmd = A.id.substr(A.id.indexOf("_cmd_") + 5);
    A.editorid = this.editorid;
    this.buttons[A.cmd] = A;
    if (A.cmd == "switchmode") {
        if (AJAX_Compatible) {
        	   console.log('AJAX_Compatible'+A.cmd) ;
            console.log(this.buttons);
            A.state = this.wysiwyg_mode ? true : false;
            this.set_control_style(A, "button", this.wysiwyg_mode ? "selected" : "normal")
        } else {
            A.parentNode.removeChild(A)
        }
    } else {
        A.state = false;
        A.mode = "normal";
        if (A.cmd == "bold" || A.cmd == "italic" || A.cmd == "underline") {
            this.allowbasicbbcode = true
        }
    }
    A.onclick = A.onmousedown = A.onmouseover = A.onmouseout = vB_Text_Editor_Events.prototype.command_button_onmouseevent
};
vB_Text_Editor.prototype.init_controls = function () {
    var A = new Array();
    var C, B, D, G, F;
    if (this.controlbar == null) {
        return
    }
    var D = YAHOO.util.Dom.getElementsByClassName("imagebutton", "", this.controlbar);
    for (C = 0; C < D.length; C++) {
        if (YAHOO.util.Dom.hasClass(D[C], "imagebutton") && D[C].id) {
            A[A.length] = D[C].id;
            if (is_ie) {
                G = D[C].getElementsByTagName("img");
                for (B = 0; B < G.length; B++) {
                    if (G[B].alt == "") {
                        G[B].title = D[C].title
                    }
                }
            }
        }
    }
    var E = YAHOO.util.Dom.getElementsByClassName("menubutton", "", this.controlbar);
    for (C = 0; C < E.length; C++) {
        if (YAHOO.util.Dom.hasClass(E[C], "menubutton") && E[C].id) {
            A[A.length] = E[C].id;
            if (is_ie) {
                G = D[C].getElementsByTagName("img");
                for (B = 0; B < G.length; B++) {
                    if (G[B].alt == "") {
                        G[B].title = D[C].title
                    }
                }
            }
        }
    }
    for (C = 0; C < A.length; C++) {
        F = fetch_object(A[C]);
        if (F.id.indexOf(this.editorid + "_cmd_") != -1) {
            this.init_command_button(F)
        } else {
            if (F.id.indexOf(this.editorid + "_popup_") != -1) {
                this.init_popup_menu(F)
            }
        }
    }
    set_unselectable(this.controlbar)
};
vB_Text_Editor.prototype.init_menu_container = function (C, B, A, E) {
    var D = document.createElement("div");
    D.id = this.editorid + "_popup_" + C + "_menu";
    D.className = "vbmenu_popup";
    D.style.display = "none";
    D.style.cursor = "default";
    D.style.padding = "3px";
    D.style.width = B;
    D.style.height = A;
    D.style.overflow = E;
    return D
};
vB_Text_Editor.prototype.init_popup_menu = function (B) {
    if (this.disabled) {
        return false
    }
    B.cmd = B.id.substr(B.id.indexOf("_popup_") + 7);
    B.editorid = this.editorid;
    this.buttons[B.cmd] = B;
    switch (B.cmd) {
    case "fontname":
        this.build_fontname_popup(B);
        break;
    case "fontsize":
        this.build_fontsize_popup(B);
        break;
    case "forecolor":
        this.build_forecolor_popup(B);
        break;
    case "smilie":
        this.build_smilie_popup(B);
        break;
    case "attach":
        var A = YAHOO.util.Dom.getElementsByClassName("popupctrl", "div", B);
        if (!YAHOO.util.Event.getListeners(B, "mouseover")) {
            YAHOO.util.Event.on(B, "mouseover", vB_Text_Editor.prototype.menu_context, B, this);
            YAHOO.util.Event.on(B, "mouseout", vB_Text_Editor.prototype.menu_context, B, this);
            YAHOO.util.Event.on(B, "mouseup", vB_Text_Editor.prototype.menu_context, B, this);
            YAHOO.util.Event.on(B, "mousedown", vB_Text_Editor.prototype.menu_context, B, this);
            YAHOO.util.Event.on(A[0], "click", vB_Text_Editor.prototype.attachpopup);
            YAHOO.util.Event.on("manageattach", "click", vB_Text_Editor_Events.prototype.attachmanage_onclick);
            this.popups.attach = true;
            if (typeof vB_Attachments != "undefined" && vB_Attachments.has_attachments()) {
                this.build_attachments_popup(B)
            } else {
                if (typeof (vB_Attachments) != "undefined") {}
                return false
            }
        }
    }
    return true
};
vB_Text_Editor.prototype.attachpopup = function (B, A) {
    if (typeof (vB_Attachments) != "undefined" && !vB_Attachments.has_attachments()) {
        vB_Attachments.attachmanage()
    }
};
vB_Text_Editor.prototype.init_smilies = function (C) {
    if (C != null) {
        var B = fetch_tags(C, "img");
        for (var A = 0; A < B.length; A++) {
            if (B[A].id && B[A].id.indexOf("_smilie_") != false) {
                B[A].style.cursor = pointer_cursor;
                B[A].editorid = this.editorid;
                B[A].onclick = vB_Text_Editor_Events.prototype.smilie_onclick;
                B[A].unselectable = "on"
            }
        }
    }
};
vB_Text_Editor.prototype.insert_node_at_selection = function (F) {
    this.check_focus();
    var E = this.editwin.getSelection();
    var B = E ? E.getRangeAt(0) : this.editdoc.createRange();
    E.removeAllRanges();
    B.deleteContents();
    var C = B.startContainer;
    var G = B.startOffset;
    switch (C.nodeType) {
    case Node.ELEMENT_NODE:
        if (F.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
            D = F.firstChild
        } else {
            D = F
        }
        C.insertBefore(F, C.childNodes[G]);
        this.add_range(D);
        break;
    case Node.TEXT_NODE:
        if (F.nodeType == Node.TEXT_NODE) {
            var A = G + F.length;
            C.insertData(G, F.data);
            B = this.editdoc.createRange();
            B.setEnd(C, A);
            B.setStart(C, A);
            E.addRange(B)
        } else {
            C = C.splitText(G);
            var D;
            if (F.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
                D = F.firstChild
            } else {
                D = F
            }
            C.parentNode.insertBefore(F, C);
            this.add_range(D)
        }
        break
    }
};
vB_Text_Editor.prototype.insert_smilie = function (F, E, D, A) {
    if (this.wysiwyg_mode) {
        if (is_moz || is_opera) {
            this.check_focus();
            try {
                this.apply_format("InsertImage", false, D);
                var C = fetch_tags(this.editdoc.body, "img");
                for (var B = 0; B < C.length; B++) {
                    if (C[B].src == D) {
                        C[B].className = "inlineimg";
                        if (C[B].getAttribute("smilieid") < 1) {
                            C[B].setAttribute("smilieid", A);
                            C[B].setAttribute("border", "0")
                        }
                    }
                }
            } catch (F) {}
        } else {
            this.check_focus();
            return this.insert_text('<img src="' + D + '" border="0" class="inlineimg" alt="0" smilieid="' + A + '" />', false)
        }
    } else {
        this.check_focus();
        return this.insert_text(E, E.length, 0)
    }
};
vB_Text_Editor.prototype.insert_text = function (F, E, A) {
    if (this.wysiwyg_mode) {
        if (is_moz || is_opera) {
            this.editdoc.execCommand("insertHTML", false, F)
        } else {
            this.check_focus();
            if (typeof (this.editdoc.selection) != "undefined" && this.editdoc.selection.type != "Text" && this.editdoc.selection.type != "None") {
                E = false;
                this.editdoc.selection.clear()
            }
            var D = this.editdoc.selection.createRange();
            D.pasteHTML(F);
            if (F.indexOf("\n") == -1) {
                if (E === false) {} else {
                    if (typeof E != "undefined") {
                        D.moveStart("character", -F.vBlength() + E);
                        D.moveEnd("character", -A)
                    } else {
                        D.moveStart("character", -F.vBlength())
                    }
                }
                D.select()
            }
        }
    } else {
        var C = false;
        this.check_focus();
        if (typeof (this.editdoc.selectionStart) != "undefined") {
            var G = this.editdoc.selectionStart + 0;
            var B = this.editdoc.scrollTop;
            this.editdoc.value = this.editdoc.value.substr(0, this.editdoc.selectionStart) + F + this.editdoc.value.substr(this.editdoc.selectionEnd);
            if (E === false) {} else {
                if (typeof E != "undefined") {
                    this.editdoc.selectionStart = G + E;
                    this.editdoc.selectionEnd = G + F.vBlength() - A
                } else {
                    this.editdoc.selectionStart = G;
                    this.editdoc.selectionEnd = G + F.vBlength()
                }
            }
            this.editdoc.scrollTop = B
        } else {
            if (document.selection && document.selection.createRange) {
                var D = document.selection.createRange();
                D.text = F.replace(/\r?\n/g, "\r\n");
                if (E === false) {} else {
                    if (typeof E != "undefined") {
                        if ((E - F.vBlength()) != 0) {
                            D.moveStart("character", E - F.vBlength());
                            C = true
                        }
                        if (A != 0) {
                            D.moveEnd("character", -A);
                            C = true
                        }
                    } else {
                        D.moveStart("character", -F.vBlength());
                        C = true
                    }
                } if (C) {
                    D.select()
                }
            } else {
                this.editdoc.value += F
            }
        }
    }
};
vB_Text_Editor.prototype.insertvideo = function (A) {
    this.create_editor_dialog('<img src="' + IMGDIR_MISC + '/lightbox_progress.gif" alt="" />', this.insertvideo_confirm);
    YAHOO.util.Connect.asyncRequest("POST", "ajax.php?do=fetchhtml", {
        success: this.insertvideo_ajax,
        failure: this.remove_editor_dialog,
        timeout: vB_Default_Timeout,
        argument: [this.editorid],
        scope: this
    }, SESSIONURL + "&securitytoken=" + SECURITYTOKEN + "&ajax=1&do=fetchhtml&template=editor_video_overlay")
};
vB_Text_Editor.prototype.insertvideo_ajax = function (B) {
    if (B.responseXML) {
        var A = B.responseXML.getElementsByTagName("html");
        if (A.length) {
            this.create_editor_dialog(A[0].firstChild.nodeValue, this.insertvideo_confirm, true);
            YAHOO.util.Dom.get("videourl").focus();
            return
        }
    }
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.insertvideo_confirm = function () {
    var A = this.dialog.elements.videourl.value;
    var B = false;
    if (A = this.verify_prompt(A)) {
        this.insert_text("[video]" + A + "[/video]")
    }
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.insertimagesettings_ajax = function (B) {
    if (B.responseXML) {
        var A = B.responseXML.getElementsByTagName("html");
        if (A.length) {
            this.create_editor_dialog(A[0].firstChild.nodeValue, this.insertimagesettings_confirm, true);
            YAHOO.util.Dom.get("imageconfigtarget").src = this.activeimg.src;
            YAHOO.util.Event.on("vb_alignment_none", "click", vB_Text_Editor.prototype.insertimagesettings_alignment, this);
            YAHOO.util.Event.on("vb_alignment_right", "click", vB_Text_Editor.prototype.insertimagesettings_alignment, this);
            YAHOO.util.Event.on("vb_alignment_left", "click", vB_Text_Editor.prototype.insertimagesettings_alignment, this);
            YAHOO.util.Event.on("vb_alignment_center", "click", vB_Text_Editor.prototype.insertimagesettings_alignment, this);
            YAHOO.util.Event.on("vb_link_none", "click", vB_Text_Editor.prototype.insertimagesettings_link, this);
            YAHOO.util.Event.on("vb_link_content", "click", vB_Text_Editor.prototype.insertimagesettings_link, this);
            YAHOO.util.Event.on("vb_link_image", "click", vB_Text_Editor.prototype.insertimagesettings_link, this);
            this.remove_activeimg();
            return
        }
    }
    this.remove_activeimg();
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.insertimagesettings_confirm = function () {
    var B = YAHOO.util.Dom.get("imageconfigtarget");
    var C = B.src.match(/attachmentid=(\d+)/i);
    if (C) {
        var A = new vB_Hidden_Form(null);
        A.add_variables_from_object(YAHOO.util.Dom.get(this.editorid + "_dialog"));
        A.add_variable("attachmentid", C[1]);
        YAHOO.util.Dom.setStyle("imageoverlay_progress", "display", "inline");
        YAHOO.util.Connect.asyncRequest("POST", "ajax.php?do=saveimageconfig", {
            success: this.remove_editor_dialog,
            failure: this.insertimagesettings_failure,
            timeout: vB_Default_Timeout,
            scope: this
        }, SESSIONURL + "securitytoken=" + SECURITYTOKEN + "&do=saveimageconfig&ajax=1&" + A.build_query_string())
    } else {
        alert(this.phrase.unable_to_parse_attachmentid_from_image);
        this.remove_editor_dialog()
    }
};
vB_Text_Editor.prototype.insertimagesettings_failure = function () {
    YAHOO.util.Dom.setStyle("imageoverlay_progress", "display", "none");
    alert(vbphrase.saving_of_settings_failed)
};
vB_Text_Editor.prototype.insertimagesettings_link = function (C) {
    var B = YAHOO.util.Event.getTarget(C);
    var A = YAHOO.util.Dom.get("linkurl");
    switch (B.id) {
    case "vb_link_none":
        A.setAttribute("value", "");
        break;
    case "vb_link_content":
        A.setAttribute("value", "What goes here?");
        break;
    case "vb_link_image":
        A.setAttribute("value", "[image]");
        break
    }
};
vB_Text_Editor.prototype.insertimagesettings_alignment = function (B) {
    var A = YAHOO.util.Event.getTarget(B);
    YAHOO.util.Dom.removeClass("imageconfigtarget", "left");
    YAHOO.util.Dom.removeClass("imageconfigtarget", "right");
    YAHOO.util.Dom.removeClass("imageconfigtarget", "center");
    switch (A.id) {
    case "vb_alignment_left":
        YAHOO.util.Dom.addClass("imageconfigtarget", "left");
        break;
    case "vb_alignment_right":
        YAHOO.util.Dom.addClass("imageconfigtarget", "right");
        break;
    case "vb_alignment_center":
        YAHOO.util.Dom.addClass("imageconfigtarget", "center");
        break
    }
};
vB_Text_Editor.prototype.insertimagesettings_failure = function (A) {
    this.remove_activeimg();
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.insertimage = function (B, A) {
	
	is_opera = navigator.userAgent.indexOf("Opera");
	
	
	//alert("Opera");	
	
    //if (this.wysiwyg_mode) { // && typeof (vBulletin.attachinfo) != "undefined" && typeof (vBulletin.attachinfo.contenttypeid) != "undefined" && vBulletin.attachinfo.contenttypeid != 0 && typeof (A) == "undefined") {
        this.show_editor_progress();
        YAHOO.util.Connect.asyncRequest("POST", "ajax.php?do=fetchhtml", {
            success: this.insertimage_ajax,
            failure: this.remove_editor_dialog,
            timeout: vB_Default_Timeout,
            argument: [this.editorid],
            scope: this
        }, SESSIONURL + "&securitytoken=" + SECURITYTOKEN + "&ajax=1&do=fetchhtml&template=editor_upload_overlay")
    	//alert("Test chrome");
   // } 
   
    
    /*else {
        img = this.show_prompt(vbphrase.enter_image_url, "http://", true);
        if (img = this.verify_prompt(img)) {
            return this.apply_format("insertimage", false, img)
        } else {
            return false
        }
    }*/
};
vB_Text_Editor.prototype.insertimage_ajax = function (C) {
    if (C.responseXML) {
        var A = C.responseXML.getElementsByTagName("html");
        if (A.length) {
            this.create_editor_dialog(A[0].firstChild.nodeValue, this.insertimage_confirm, true);
            if (typeof (TabsLightJS) == "undefined") {
                var B = this;
                YAHOO.vBulletin.LoadCss("css.php?sheet=yuiupload.css");
                YAHOO.vBulletin.LoadScript("clientscript/vbulletin-tabslight.js?v=" + SIMPLEVERSION, function () {
                    init_tabslight()
                });
                YAHOO.vBulletin.LoadScript("clientscript/yui/combo/imageupload.js?v=" + SIMPLEVERSION, function () {
                    YAHOO.vBulletin.LoadScript("clientscript/vbulletin_yuiupload.js?v=" + SIMPLEVERSION, function () {
                        YAHOO.vBulletin.LoadScript("clientscript/vbulletin_imageup.js?v=" + SIMPLEVERSION, function () {
                            B.insertimage_ready()
                        })
                    })
                })
            } else {
                init_tabslight();
                this.insertimage_ready()
            }
            return
        }
    }
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.insertimage_ready = function (B) {
    this.hide_editor_progress();
    YAHOO.util.Dom.removeClass("editor_upload_overlay", "hidden");
    this.position_dialog(this.dialog);
    var A = new vB_ImageUpload(this.editorid + "_dialog");
    A.events.complete.subscribe(this.insertimage_complete, this);
    A.events.uploaddone.subscribe(this.insertimage_uploaddone, this)
};
vB_Text_Editor.prototype.insertimage_confirm = function (E) {
    YAHOO.util.Event.stopEvent(E);
    if (!YAHOO.util.Dom.get("urlretrieve").checked) {
        if (img = this.verify_prompt(YAHOO.util.Dom.get("urlupload").value)) {
            this.check_focus();
            this.apply_format("insertimage", false, img)
        }
        this.remove_editor_dialog();
        return
    }
    var C = YAHOO.util.Dom.get("urlupload").value;
    if (!C) {
        this.remove_editor_dialog()
    } else {
        this.show_editor_progress();
        var F = {
            upload: this.insertimage_uploadurl,
            failure: function (G) {
                vBulletin_AJAX_Error_Handler(G);
                this.hide_editor_progress()
            },
            scope: this
        };
        var B = YAHOO.util.Dom.get(this.editorid + "_dialog");
        B.action = "newattachment.php";
        B.posthash.value = vBulletin.attachinfo.posthash;
        B.poststarttime.value = vBulletin.attachinfo.poststarttime;
        B.contenttypeid.value = vBulletin.attachinfo.contenttypeid;
        for (var D in vBulletin.attachinfo.values) {
            var A = document.createElement("input");
            A.name = "values[" + D + "]";
            A.value = vBulletin.attachinfo.values[D];
            A.type = "hidden";
            B.appendChild(A)
        }
        YAHOO.util.Connect.setForm(B, true, true);
        YAHOO.util.Connect.asyncRequest("POST", "newattachment.php", F, "ajax=1");
        return false
    }
};
vB_Text_Editor.prototype.insertimage_uploadurl = function (B) {
    var C = B.responseText.match(/^ok - ([\d]+) - ([01])/);
    if (C) {
        this.insert_attachment(C[1], vBulletin.attachinfo.contenttypeid, C[2])
    } else {
        var A = B.responseText.match(/^error: (.*)$/);
        alert(A ? A[1] : vbphrase.upload_failed)
    }
    this.remove_editor_dialog()
};
vB_Text_Editor.prototype.insertimage_uploaddone = function (C, A, B) {
    B.insert_attachment(A[0], A[1], A[2])
};
vB_Text_Editor.prototype.insertimage_complete = function (C, A, B) {
    B.remove_editor_dialog()
};
vB_Text_Editor.prototype.insert_attachment = function (B, A, C) {
    if (C != 0 && this.wysiwyg_mode) {
        if (is_moz) {
            this.insert_text('<img src="' + BBURL + "/attachment.php?" + (SESSIONURL != "" ? SESSIONURL + "amp;" : "") + "attachmentid=" + B + "&amp;cid=" + A + '&amp;stc=1" alt="" class="previewthumb" />')
        } else {
            this.insert_text('<img src="' + BBURL + "/attachment.php?" + (SESSIONURL != "" ? SESSIONURL + "amp;" : "") + "attachmentid=" + B + "&amp;cid=" + A + '&amp;stc=1" alt="" class="previewthumb" />')
        }
    } else {
        this.insert_text("[ATTACH]" + B + "[/ATTACH]")
    }
    this.collapse_selection_end()
};
vB_Text_Editor.prototype.insertlist = function (C, D) {
    var A = "[LIST" + (D ? ("=" + D) : "") + "]\n";
    var F = "[/LIST]";
    var E;
    if (E = this.get_selection()) {
        var H = new RegExp("([\r\n]+|^[\r\n]*)(?!\\[\\*\\]|\\[\\/?list)(?=[^\r\n])", "gi");
        E = A + PHP.trim(E).replace(H, "$1[*]") + "\n" + F;
        this.insert_text(E, E.vBlength(), 0)
    } else {
        this.insert_text(A + F, A.length, F.length);
        if (YAHOO.env.ua.ie >= 7) {
            var I = fetch_tags(document, "base");
            var B;
            if (I && I[0] && I[0].href) {
                B = I[0].href
            } else {
                B = ""
            }
            var G = window.showModalDialog(B + "clientscript/ieprompt.html?", {
                value: "",
                label: vbphrase.enter_list_item,
                dir: document.dir,
                title: document.title,
                listtype: D
            }, "dialogWidth:320px; dialogHeight:232px; dialogTop:" + (parseInt(window.screenTop) + parseInt(window.event.clientY) + parseInt(document.body.scrollTop) - 100) + "px; dialogLeft:" + (parseInt(window.screenLeft) + parseInt(window.event.clientX) + parseInt(document.body.scrollLeft) - 160) + "px; resizable: No;");
            if (this.verify_prompt(G)) {
                this.insert_text(G, G.vBlength(), 0)
            }
        } else {
            while (G = this.show_prompt(vbphrase.enter_list_item, "", false)) {
                G = "[*]" + G + "\n";
                this.insert_text(G, G.vBlength(), 0)
            }
        }
    }
};
vB_Text_Editor.prototype.insertorderedlist = function (A) {
    if (this.wysiwyg_mode) {
        return this.apply_format("insertorderedlist", false, true)
    } else {
        this.insertlist(vbphrase.insert_ordered_list, "1")
    }
};
vB_Text_Editor.prototype.insertunorderedlist = function (A) {
    if (this.wysiwyg_mode) {
        return this.apply_format("insertunorderedlist", false, true)
    } else {
        this.insertlist(vbphrase.insert_unordered_list, "")
    }
};
vB_Text_Editor.prototype.menu_context = function (C, B) {
    if (this.disabled) {
        return
    }
    var A = YAHOO.util.Dom.getElementsByClassName("popupctrl", "div", B);
    switch (C.type) {
    case "mouseout":
        if (!YAHOO.util.Dom.hasClass(A[0], "imagebutton_down")) {
            this.set_control_style(A[0], "button", "normal")
        }
        break;
    case "mousedown":
        if (YAHOO.util.Dom.hasClass(A[0], "imagebutton_down")) {
            this.set_control_style(A[0], "button", "hover")
        } else {
            this.set_control_style(A[0], "popup", "down")
        }
        break;
    case "mouseup":
    case "mouseover":
        this.set_control_style(A[0], "button", "hover");
        break
    }
};
vB_Text_Editor.prototype.open_smilie_window = function (B, A) {
    smilie_window = openWindow("misc.php?" + SESSIONURL + "do=getsmilies&editorid=" + this.editorid, B, A, "smilie_window");
    window.onunload = vB_Text_Editor_Events.prototype.smiliewindow_onunload
};
vB_Text_Editor.prototype.outdent = function (B) {
    if (this.wysiwyg_mode) {
        return this.apply_format("outdent", false, true)
    } else {
        var A = this.get_selection();
        A = this.strip_simple("indent", A, 1);
        this.insert_text(A)
    }
};
vB_Text_Editor.prototype.prepare_submit = function (C, A) {
    var B;
    if (this.wysiwyg_mode) {
        this.textobj.value = this.get_editor_contents();
        returnvalue = validatemessage(stripcode(this.textobj.value, true), C, A)
    } else {
        returnvalue = validatemessage(this.textobj.value, C, A)
    } if (returnvalue) {
        return returnvalue
    } else {
        if (this.captcha != null && this.captcha.failed) {
            return returnvalue
        } else {
            this.check_focus();
            return false
        }
    }
};
vB_Text_Editor.prototype.prompt_link = function (C, B, A, D) {
    if (typeof B == "undefined") {
        B = this.show_prompt(A, D, true)
    }
    if ((B = this.verify_prompt(B)) !== false) {
        if (this.get_selection()) {
            this.apply_format("unlink");
            this.wrap_tags(C, B)
        } else {
            this.wrap_tags(C, B, B)
        }
    }
    return true
};
vB_Text_Editor.prototype.read_nodes = function (C, H) {
    var F = "";
    var G = /_moz/i;
    switch (C.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.DOCUMENT_FRAGMENT_NODE:
        var D;
        var E;
        if (H) {
            D = !C.hasChildNodes();
            F = "<" + C.tagName.toLowerCase();
            var A = C.attributes;
            for (E = 0; E < A.length; ++E) {
                var B = A.item(E);
                if (!B.specified || B.name.match(G) || B.value.match(G)) {
                    continue
                }
                F += " " + B.name.toLowerCase() + '="' + B.value + '"'
            }
            F += D ? " />" : ">"
        }
        for (E = C.firstChild; E; E = E.nextSibling) {
            F += this.read_nodes(E, true)
        }
        if (H && !D) {
            F += "</" + C.tagName.toLowerCase() + ">"
        }
        break;
    case Node.TEXT_NODE:
        F = PHP.htmlspecialchars(C.data);
        break
    }
    return F
};
vB_Text_Editor.prototype.recreate_editor = function (A, F, B, D, C, E) {
    return new vB_Text_Editor(A, F, B, D, C, E)
};
vB_Text_Editor.prototype.redo = function () {
    if (this.wysiwyg_mode) {
        return this.apply_format("redo", false, true)
    } else {
        this.history.move_cursor(1);
        var A;
        if ((A = this.history.get_snapshot()) !== false) {
            this.editdoc.value = A
        }
    }
};
vB_Text_Editor.prototype.removeformat = function (D) {
    if (this.wysiwyg_mode) {
        return this.apply_format("removeformat", false, true)
    } else {
        var B = new Array("b", "i", "u");
        var C = new Array("font", "color", "size");
        var E = this.get_selection();
        if (E === false) {
            return
        }
        var A;
        for (A in B) {
            if (YAHOO.lang.hasOwnProperty(B, A)) {
                E = this.strip_simple(B[A], E)
            }
        }
        for (A in C) {
            if (YAHOO.lang.hasOwnProperty(C, A)) {
                E = this.strip_complex(C[A], E)
            }
        }
        this.insert_text(E)
    }
};
vB_Text_Editor.prototype.resize_editor = function (B) {
    var A = parseInt(YAHOO.util.Dom.getStyle(this.editbox, "height"), 10) + B;
    if (A >= 60) {
        YAHOO.util.Dom.setStyle(this.editbox, "height", A + "px");
        if (B % 99 != 0) {
            set_cookie("editor_height", A)
        }
        custom_editor_events.editor_switch.fire(this)
    }
};
vB_Text_Editor.prototype.set_color_context = function (C) {
    if (this.buttons.forecolor) {
        if (typeof C == "undefined") {
            C = this.editdoc.queryCommandValue("forecolor")
        }
        if (C != this.colorstate) {
            if (this.popupmode) {
                var B = fetch_object(this.editorid + "_color_" + this.translate_color_commandvalue(this.colorstate));
                if (B != null) {
                    B.state = false;
                    this.button_context(B, "mouseout", "menu")
                }
                this.colorstate = C;
                elmid = this.editorid + "_color_" + this.translate_color_commandvalue(C);
                B = fetch_object(elmid);
                if (B != null) {
                    B.state = true;
                    this.button_context(B, "mouseout", "menu")
                }
            } else {
                this.colorstate = C;
                C = this.translate_color_commandvalue(this.colorstate);
                for (var A = 0; A < this.buttons.forecolor.options.length; A++) {
                    if (this.buttons.forecolor.options[A].value == C) {
                        this.buttons.forecolor.selectedIndex = A;
                        break
                    }
                }
            }
        }
    }
};
vB_Text_Editor.prototype.set_context = function (C) {
    if (!this.wysiwyg_mode) {
        return
    }
    for (var A in contextcontrols) {
        if (!YAHOO.lang.hasOwnProperty(contextcontrols, A)) {
            continue
        }
        var D = fetch_object(this.editorid + "_cmd_" + contextcontrols[A]);
        if (D != null) {
            var B = this.editdoc.queryCommandState(contextcontrols[A]);
            if (D.state != B) {
                D.state = B;
                this.button_context(D, (D.cmd == C ? "mouseover" : "mouseout"))
            }
        }
    }
    this.set_font_context();
    this.set_size_context();
    this.set_color_context()
};
vB_Text_Editor.prototype.set_control_style = function (B, A, C) {
    if (B.mode != C) {
        B.mode = C;
        YAHOO.util.Dom.removeClass(B, "imagebutton_selected");
        YAHOO.util.Dom.removeClass(B, "imagebutton_hover");
        YAHOO.util.Dom.removeClass(B, "imagebutton_down");
        switch (B.mode) {
        case "down":
            YAHOO.util.Dom.addClass(B, "imagebutton_down");
            break;
        case "selected":
            YAHOO.util.Dom.addClass(B, "imagebutton_selected");
            break;
        case "hover":
            YAHOO.util.Dom.addClass(B, "imagebutton_hover");
            break;
        case "normal":
            break
        }
        return
    }
};
vB_Text_Editor.prototype.set_direction = function () {
    this.editdoc.dir = this.textobj.dir
};
vB_Text_Editor.prototype.set_editor_contents = function (B) {
    if (this.wysiwyg_mode) {
        if (fetch_object(this.editorid + "_iframe")) {
            this.editbox = fetch_object(this.editorid + "_iframe");
            YAHOO.util.Dom.setStyle(this.editbox, "display", "")
        } else {
            var A = document.createElement("iframe");
            if (is_ie && window.location.protocol == "https:") {
                A.src = "clientscript/index.html"
            }
            if (is_ie) {
                YAHOO.util.Dom.setAttribute(A, "frameBorder", "0")
            }
            this.editbox = this.textobj.parentNode.appendChild(A);
            this.editbox.id = this.editorid + "_iframe";
            this.editbox.tabIndex = 1;
            YAHOO.util.Dom.addClass(this.editbox, "textbox")
        }
        this.textobj.style.display = "none";
        this.editwin = this.editbox.contentWindow;
        this.editdoc = this.editwin.document;
        this.write_editor_contents((typeof B == "undefined" ? this.textobj.value : B), true);
        if (this.editdoc.dir == "rtl") {}
        this.spellobj = this.editdoc.body;
        this.editdoc.editorid = this.editorid;
        this.editwin.editorid = this.editorid;
        if (is_moz) {
            this.editdoc.addEventListener("keypress", vB_Text_Editor_Events.prototype.editdoc_onkeypress, true)
        } else {
            YAHOO.util.Dom.setStyle(this.editdoc.body, "margin-top", "10px")
        }
    } else {
        var A = this.textobj.parentNode.getElementsByTagName("iframe")[0];
        if (A) {
            this.textobj.style.display = "";
            this.textobj.style.width = A.style.width;
            this.textobj.style.height = A.style.height;
            YAHOO.util.Dom.setStyle(A, "display", "none")
        }
        this.editwin = this.textobj;
        this.editdoc = this.textobj;
        this.editbox = this.textobj;
        this.spellobj = this.textobj;
        this.set_editor_width(this.textobj.style.width);
        if (typeof B != "undefined") {
            this.write_editor_contents(B)
        }
        this.editdoc.editorid = this.editorid;
        this.editwin.editorid = this.editorid;
        this.history.add_snapshot(this.get_editor_contents())
    }
};
vB_Text_Editor.prototype.set_editor_functions = function () {
    if (this.wysiwyg_mode) {
        if (!YAHOO.util.Event.getListeners(this.editdoc, "mousemove")) {
            YAHOO.util.Event.on(this.editdoc, "mousemove", vB_Text_Editor_Events.prototype.editdoc_onmousemove, this, true);
            YAHOO.util.Event.on(this.editdoc, "click", vB_Text_Editor_Events.prototype.editdoc_onclick, this, true);
            YAHOO.util.Event.on(this.editdoc, "mousedown", vB_Text_Editor_Events.prototype.editdoc_onmousedown, this, true);
            if (is_moz) {
                YAHOO.util.Event.on(this.editdoc, "dragdrop", vB_Text_Editor_Events.prototype.editdoc_ondragdrop, this, true);
                this.editdoc.addEventListener("mouseup", vB_Text_Editor_Events.prototype.editdoc_onmouseup, true);
                this.editdoc.addEventListener("keyup", vB_Text_Editor_Events.prototype.editdoc_onkeyup, true);
                this.editwin.addEventListener("focus", vB_Text_Editor_Events.prototype.editwin_onfocus, true);
                this.editwin.addEventListener("blur", vB_Text_Editor_Events.prototype.editwin_onblur, true)
            } else {
                this.editdoc.onmouseup = vB_Text_Editor_Events.prototype.editdoc_onmouseup;
                this.editdoc.onkeyup = vB_Text_Editor_Events.prototype.editdoc_onkeyup;
                if (this.editdoc.attachEvent) {
                    this.editdoc.body.attachEvent("onresizestart", vB_Text_Editor_Events.prototype.editdoc_onresizestart)
                }
                this.editwin.onfocus = vB_Text_Editor_Events.prototype.editwin_onfocus;
                this.editwin.onblur = vB_Text_Editor_Events.prototype.editwin_onblur
            }
        }
    } else {
        if (this.editdoc.addEventListener) {
            if (!YAHOO.util.Event.getListeners(this.editdoc, "keypress")) {
                YAHOO.util.Event.on(this.editdoc, "keypress", vB_Text_Editor_Events.prototype.editdoc_onkeypress, this, true)
            }
        } else {
            if (is_ie) {
                this.editdoc.onkeydown = vB_Text_Editor_Events.prototype.editdoc_onkeypress
            }
        }
        this.editwin.onfocus = vB_Text_Editor_Events.prototype.editwin_onfocus;
        this.editwin.onblur = vB_Text_Editor_Events.prototype.editwin_onblur
    }
};
vB_Text_Editor.prototype.set_editor_style = function () {
    if (!this.wysiwyg_mode) {
        return
    }
    var F = "";
    var H = false;
    var C = fetch_all_stylesheets(document.styleSheets);
    for (var M = 0; M < C.length; M++) {
        try {
            var K = (C[M].cssRules ? C[M].cssRules : C[M].rules);
            if (K.length <= 0) {
                continue
            }
        } catch (I) {
            continue
        }
        for (var E = 0; E < K.length; E++) {
            if (!K[E].selectorText) {
                continue
            }
            var B = false;
            var J = new Array();
            if (K[E].selectorText.indexOf(".wysiwyg") >= 0) {
                var A = K[E].selectorText.split(",");
                for (var D = 0; D < A.length; D++) {
                    if (A[D].indexOf(".wysiwyg") >= 0) {
                        J.push(A[D])
                    }
                    if (A[D].indexOf("#usercss") >= 0) {
                        H = true
                    }
                }
                B = true
            }
            if (B) {
                var G = "{ " + K[E].style.cssText + " }";
                if (is_moz) {
                    G = G.replace(/; /g, " !important; ")
                }
                F += J.join(", ") + " " + G + "\n"
            }
        }
    }
    if (is_ie) {
        this.editdoc.createStyleSheet().cssText = F
    } else {
        var L = this.editdoc.createElement("style");
        L.type = "text/css";
        L.innerHTML = F;
        this.editdoc.documentElement.childNodes[0].appendChild(L)
    } if (H) {
        this.editdoc.body.parentNode.id = "usercss"
    }
    this.editdoc.body.className = "wysiwyg"
};
vB_Text_Editor.prototype.set_editor_width = function (C, B) {
    if (this.wysiwyg_mode) {
        this.editbox.style.width = C
    } else {
        if (typeof (this.textobj.style.oWidth) == "undefined" || B) {
            this.textobj.style.oWidth = C
        }
        if (is_ie) {
            this.textobj.style.width = this.textobj.style.oWidth;
            var A = this.textobj.offsetWidth;
            if (A > 0) {
                this.textobj.style.width = A + "px";
                this.textobj.style.width = (A + A - this.textobj.offsetWidth) + "px"
            }
        } else {
            this.textobj.style.width = C
        }
    }
};
vB_Text_Editor.prototype.set_font_context = function (B) {
    if (this.buttons.fontname) {
        if (typeof B == "undefined") {
            B = this.editdoc.queryCommandValue("fontname")
        }
        switch (B) {
        case "":
            if (!is_ie && window.getComputedStyle) {
                B = this.editdoc.body.style.fontFamily
            }
            break;
        case null:
            B = "";
            break
        }
        if (B != this.fontstate) {
            this.fontstate = B;
            var A;
            if (this.popupmode) {
                if (YAHOO.lang.hasOwnProperty(this.fontoptions, this.fontstate)) {
                    YAHOO.util.Dom.get(this.editorid + "_fontfield").innerHTML = this.fontoptions[this.fontstate]
                } else {
                    YAHOO.util.Dom.get(this.editorid + "_fontfield").innerHTML = this.fontoptions[""]
                }
            } else {
                for (A = 0; A < this.buttons.fontname.options.length; A++) {
                    if (this.buttons.fontname.options[A].value == thingy) {
                        this.buttons.fontname.selectedIndex = A;
                        break
                    }
                }
            }
        }
    }
};
vB_Text_Editor.prototype.set_size_context = function (A) {
    if (this.buttons.fontsize) {
        if (typeof A == "undefined") {
            A = this.editdoc.queryCommandValue("fontsize")
        }
        switch (A) {
        case null:
        case "":
            if (is_moz) {
                A = this.translate_fontsize(this.editdoc.body.style.fontSize)
            }
            break
        }
        if (A != this.sizestate) {
            this.sizestate = A;
            var B;
            if (this.popupmode) {
                if (YAHOO.lang.hasOwnProperty(this.sizeoptions, this.sizestate)) {
                    YAHOO.util.Dom.get(this.editorid + "_sizefield").innerHTML = this.sizeoptions[this.sizestate]
                } else {
                    YAHOO.util.Dom.get(this.editorid + "_sizefield").innerHTML = this.sizeoptions[""]
                }
            } else {
                for (B = 0; B < this.buttons.fontsize.options.length; B++) {
                    if (this.buttons.fontsize.options[B].value == this.sizestate) {
                        this.buttons.fontsize.selectedIndex = B;
                        break
                    }
                }
            }
        }
    }
};
vB_Text_Editor.prototype.show_prompt = function (F, B, D) {
    var E;
    if (YAHOO.env.ua.ie >= 7) {
        var C = fetch_tags(document, "base");
        var A;
        if (C && C[0] && C[0].href) {
            A = C[0].href
        } else {
            A = ""
        }
        E = window.showModalDialog(A + "clientscript/ieprompt.html?", {
            value: B,
            label: F,
            dir: document.dir,
            title: document.title,
            forceltr: (typeof (D) != "undefined" ? D : false)
        }, "dialogWidth:320px; dialogHeight:150px; dialogTop:" + (parseInt(window.screenTop) + parseInt(window.event.clientY) + parseInt(document.body.scrollTop) - 100) + "px; dialogLeft:" + (parseInt(window.screenLeft) + parseInt(window.event.clientX) + parseInt(document.body.scrollLeft) - 160) + "px; resizable: No;")
    } else {
        E = prompt(F, B)
    } if (typeof (E) == "undefined") {
        return false
    } else {
        if (E == false || E == null) {
            return E
        } else {
            return PHP.trim(new String(E))
        }
    }
};
vB_Text_Editor.prototype.spelling = function () {
    if (is_ie) {
        try {
            eval("new ActiveXObject('ieSpell.ieSpellExtension').CheckDocumentNode(this.spellobj);")
        } catch (e) {
            if (e.number == -2146827859 && confirm(vbphrase.iespell_not_installed)) {
                window.open("http://www.iespell.com/download.php")
            }
        }
    } else {
        if (is_moz) {}
    }
};
vB_Text_Editor.prototype.strip_complex = function (A, G, B) {
    var D = "[" + A + "=";
    var C = "[/" + A + "]";
    if (typeof B == "undefined") {
        B = -1
    }
    while ((startindex = PHP.stripos(G, D)) !== false && B != 0) {
        B--;
        if ((stopindex = PHP.stripos(G, C)) !== false) {
            var E = PHP.stripos(G, "]", startindex);
            if (E !== false && E > startindex && E < stopindex) {
                var F = G.substr(E + 1, stopindex - E - 1);
                G = G.substr(0, startindex) + F + G.substr(stopindex + C.length)
            } else {
                break
            }
        } else {
            break
        }
    }
    return G
};
vB_Text_Editor.prototype.strip_simple = function (A, F, B) {
    var D = "[" + A + "]";
    var C = "[/" + A + "]";
    if (typeof B == "undefined") {
        B = -1
    }
    while ((startindex = PHP.stripos(F, D)) !== false && B != 0) {
        B--;
        if ((stopindex = PHP.stripos(F, C)) !== false) {
            var E = F.substr(startindex + D.length, stopindex - startindex - D.length);
            F = F.substr(0, startindex) + E + F.substr(stopindex + C.length)
        } else {
            break
        }
    }
    return F
};
vB_Text_Editor.prototype.switch_editor_ajax = function () {
    var A = (this.wysiwyg_mode ? 0 : 1);
    YAHOO.util.Connect.asyncRequest("POST", "ajax.php?do=editorswitch", {
        success: do_switch_editor_mode,
        timeout: vB_Default_Timeout,
        argument: [this.editorid, A]
    }, SESSIONURL + "securitytoken=" + SECURITYTOKEN + "&do=editorswitch&towysiwyg=" + A + "&parsetype=" + this.parsetype + "&allowsmilie=" + this.parsesmilies + "&message=" + PHP.urlencode(this.get_editor_contents()) + (this.ajax_extra ? ("&" + this.ajax_extra) : "") + (typeof this.textobj.form["options[allowbbcode]"] != "undefined" ? "&allowbbcode=" + this.textobj.form["options[allowbbcode]"].checked : ""))
};
vB_Text_Editor.prototype.translate_color_commandvalue = function (A) {
    if (is_moz) {
        if (A == "" || A == null) {
            A = window.getComputedStyle(this.editdoc.body, null).getPropertyValue("color")
        }
        if (A.toLowerCase().indexOf("rgb") == 0) {
            var B = A.match(/^rgb\s*\(([0-9]+),\s*([0-9]+),\s*([0-9]+)\)$/);
            if (B) {
                return this.translate_silly_hex((B[1] & 255).toString(16), (B[2] & 255).toString(16), (B[3] & 255).toString(16))
            } else {
                return this.translate_color_commandvalue(null)
            }
        } else {
            return A
        }
    } else {
        return this.translate_silly_hex((A & 255).toString(16), ((A >> 8) & 255).toString(16), ((A >> 16) & 255).toString(16))
    }
};
vB_Text_Editor.prototype.translate_fontsize = function (A) {
    switch (A) {
    case "7.5pt":
    case "10px":
        return 1;
    case "10pt":
        return 2;
    case "12pt":
        return 3;
    case "14pt":
        return 4;
    case "18pt":
        return 5;
    case "24pt":
        return 6;
    case "36pt":
        return 7;
    default:
        return ""
    }
};
vB_Text_Editor.prototype.translate_silly_hex = function (C, B, A) {
    return "#" + (PHP.str_pad(C, 2, 0) + PHP.str_pad(B, 2, 0) + PHP.str_pad(A, 2, 0))
};
vB_Text_Editor.prototype.undo = function () {
    if (this.wysiwyg_mode) {
        return this.apply_format("undo", false, true)
    } else {
        this.history.add_snapshot(this.get_editor_contents());
        this.history.move_cursor(-1);
        var A;
        if ((A = this.history.get_snapshot()) !== false) {
            this.editdoc.value = A
        }
    }
};
vB_Text_Editor.prototype.unlink = function (B) {
    if (this.wysiwyg_mode) {
        return this.apply_format("unlink", false, true)
    } else {
        var A = this.get_selection();
        A = this.strip_simple("url", A);
        A = this.strip_complex("url", A);
        this.insert_text(A)
    }
};
vB_Text_Editor.prototype.verify_prompt = function (A) {
    switch (A) {
    case "http://":
    case "null":
    case "undefined":
    case "false":
    case "":
    case null:
    case false:
        return false;
    default:
        return A
    }
};
vB_Text_Editor.prototype.wrap_tags = function (F, A, C) {
    F = F.toUpperCase();
    switch (F) {
    case "CODE":
    case "HTML":
    case "PHP":
        this.apply_format("removeformat");
        break
    }
    if (typeof C == "undefined") {
        C = this.get_selection();
        if (C === false) {
            C = ""
        } else {
            C = new String(C)
        }
    }
    var E;
    if (A === true) {
        var B = this.show_prompt(construct_phrase(vbphrase.enter_tag_option, ("[" + F + "]")), "", false);
        if (B = this.verify_prompt(B)) {
            E = "[" + F + '="' + B + '"]'
        } else {
            return false
        }
    } else {
        if (A !== false) {
            E = "[" + F + '="' + A + '"]'
        } else {
            E = "[" + F + "]"
        }
    }
    var D = "[/" + F + "]";
    var G = E + C + D;
    this.insert_text(G, E.vBlength(), D.vBlength());
    return false
};
vB_Text_Editor.prototype.write_editor_contents = function (D, B) {
    if (this.wysiwyg_mode) {
        if (D == "") {
            if (is_ie) {
                D = "<p></p>"
            } else {
                if (is_moz) {
                    D = "<br />"
                }
            }
        }
        if (this.editdoc && this.editdoc.initialized) {
            this.editdoc.body.innerHTML = D
        } else {
            var A = "";
            var C = document.childNodes[0];
            if (typeof (C.text) != "undefined" && C.nodeType == 8) {
                A = C.text
            } else {
                if (C.nodeType == 10) {
                    A = "<!DOCTYPE " + C.name + ' PUBLIC "' + C.publicId + '"' + (C.systemId ? '"' + C.systemId + '"' : "") + ">"
                }
            }
            A = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">';
            D = A + "<html><head></head><body>" + D + "</body></html>";
            this.editdoc = this.editwin.document;
            this.editdoc.open("text/html", "replace");
            this.editdoc.write(D);
            this.editdoc.close();
            if (B) {
                if (is_moz) {
                    this.editdoc.designMode = "on"
                } else {
                    this.editdoc.body.contentEditable = true
                }
            }
            this.editdoc.body.spellcheck = true;
            this.editdoc.initialized = true;
            this.set_editor_style()
        }
        this.set_direction()
    } else {
        this.textobj.value = D
    }
};
vB_Text_Editor.prototype.show_editor_progress = function () {
    var A = this.progress;
    if (!A) {
        A = document.createElement("div");
        document.body.appendChild(A);
        A.id = this.editorid + "_progress";
        YAHOO.util.Dom.setStyle(A, "position", "absolute");
        YAHOO.util.Dom.setStyle(A, "z-index", 1000);
        YAHOO.util.Dom.setStyle(A, "border", "1px solid black");
        YAHOO.util.Dom.setStyle(A, "background-color", "white")
    }
    A.innerHTML = '<img src="' + IMGDIR_MISC + '/lightbox_progress.gif" alt="" />';
    this.position_dialog(A, 300, 200);
    this.progress = A;
    this.create_dialog_overlay();
    return A
};
vB_Text_Editor.prototype.hide_editor_progress = function () {
    if (this.progress) {
        this.progress.parentNode.removeChild(this.progress);
        this.progress = null
    }
    if (!this.dialog && this.dialog_overlay) {
        this.dialog_overlay.parentNode.removeChild(this.dialog_overlay);
        this.dialog_overlay = null
    }
};
vB_Text_Editor.prototype.create_editor_dialog = function (C, A, D) {
    var B = this.dialog;
    if (!B) {
        B = document.createElement("form");
        document.body.appendChild(B);
        B.encoding = "multipart/form-data";
        B.id = this.editorid + "_dialog";
        B.style.position = "absolute";
        B.style.zIndex = 1000;
        B.style.border = "1px solid black";
        B.style.backgroundColor = "white";
        YAHOO.util.Event.on(B, "submit", this.dialog_submit_event, this, true)
    }
    B.innerHTML = C;
    this.position_dialog(B);
    this.set_dialog_events(B);
    this.run_scripts_in_element(B);
    this.move_css_in_element(B);
    this.dialog = B;
    this.create_dialog_overlay();
    this.dialog_confirm_callback = A;
    if (typeof (D) != "undefined") {
        this.setbookmark()
    }
    return B
};
vB_Text_Editor.prototype.position_dialog = function (B, C, A) {
    var E = YAHOO.util.Dom.getRegion(this.editorid);
    var D = YAHOO.util.Dom.getRegion(B);
    if (typeof (C) != "undefined") {
        D.height = A;
        D.width = C
    }
    B.style.top = Math.max(parseInt(E.top + (E.height - D.height) / 2, 10), E.top) + "px";
    B.style.left = Math.max(parseInt(E.left + (E.width - D.width) / 2, 10), E.left) + "px"
};
vB_Text_Editor.prototype.set_dialog_events = function (C) {
    var A = C.getElementsByTagName("input");
    for (var B = 0; B < A.length; B++) {
        var D = A[B];
        if (D.type == "submit") {
            YAHOO.util.Event.on(D, "click", this.dialog_button_click_event, this, true)
        }
    }
};
vB_Text_Editor.prototype.create_dialog_overlay = function () {
    if (this.dialog_overlay) {
        return this.dialog_overlay
    }
    var B = YAHOO.util.Dom.getRegion(this.editorid);
    var A = document.createElement("div");
    document.body.appendChild(A);
    A.style.position = "absolute";
    A.style.zIndex = 10;
    A.style.width = B.width + "px";
    A.style.height = B.height + "px";
    A.style.top = B.top + "px";
    A.style.left = B.left + "px";
    A.style.backgroundColor = "#000000";
    YAHOO.util.Dom.setStyle(A, "opacity", 0.5);
    this.dialog_overlay = A;
    return A
};
vB_Text_Editor.prototype.dialog_button_click_event = function (B) {
    var A = YAHOO.util.Event.getTarget(B);
    this.dialog_submitted = (A && YAHOO.util.Dom.hasClass(A, "dialog_submit_button"))
};
vB_Text_Editor.prototype.dialog_submit_event = function (B) {
    var A = this.dialog_submitted;
    this.dialog_submitted = false;
    YAHOO.util.Event.stopEvent(B);
    if (A && this.dialog_confirm_callback) {
        this.dialog_confirm_callback.call(this, B)
    } else {
        this.remove_editor_dialog()
    }
};
vB_Text_Editor.prototype.remove_editor_dialog = function () {
    if (this.dialog) {
        this.dialog.parentNode.removeChild(this.dialog);
        this.dialog = null
    }
    if (this.dialog_overlay) {
        this.dialog_overlay.parentNode.removeChild(this.dialog_overlay);
        this.dialog_overlay = null
    }
    if (this.progress) {
        this.progress.parentNode.removeChild(this.progress);
        this.progress = null
    }
    this.dialog_props = {}
};
vB_Text_Editor.prototype.run_scripts_in_element = function (E) {
    var B, D, G;
    var A = E.getElementsByTagName("script"),
        C = document.getElementsByTagName("head")[0];
    var F = A.length;
    for (D = 0; D < F; D++) {
        B = A[D];
        G = document.createElement("script");
        if (B.type) {
            G.type = B.type
        }
        if (B.text) {
            G.text = B.text
        }
        if (B.src) {
            G.src = B.src
        }
        if (B.id) {
            G.id = B.id
        }
        C.appendChild(G)
    }
};
vB_Text_Editor.prototype.move_css_in_element = function (C) {
    var A = C.getElementsByTagName("link");
    var B = document.getElementsByTagName("head")[0];
    var E = A.length;
    for (i = 0; i < E; i++) {
        var D = A[i];
        link_tag = document.createElement("link");
        if (D.rel) {
            link_tag.rel = D.rel
        }
        if (D.type) {
            link_tag.type = D.type
        }
        if (D.href) {
            link_tag.href = D.href
        }
        B.appendChild(link_tag);
        D.parentNode.removeChild(D)
    }
};
vB_Text_Editor.prototype.remove_activeimg = function () {
    if (this.activeimg) {
        YAHOO.util.Dom.removeClass(this.activeimg, "previewthumbactive");
        this.activeimg = null;
        var C = YAHOO.util.Dom.getElementsByClassName("previewthumbedit", "img", this.editdoc.body);
        var B = C.length;
        for (var A = 0; A < B; A++) {
            C[A].parentNode.removeChild(C[A])
        }
    }
};

function vB_Text_Editor_Events() {}
vB_Text_Editor_Events.prototype.smilie_onclick = function (A) {
    vB_Editor[this.editorid].insert_smilie(A, this.alt, this.src, this.id.substr(this.id.lastIndexOf("_") + 1));
    if (typeof smilie_window != "undefined" && !smilie_window.closed) {
        smilie_window.focus()
    }
    return false
};
vB_Text_Editor_Events.prototype.command_button_onmouseevent = function (A) {
    A = do_an_e(A);
    if (A.type == "click" && !YAHOO.util.Dom.hasClass(this.editorid + "_cmd_" + this.cmd, "imagebutton_disabled")) {
        vB_Editor[this.editorid].format(A, this.cmd, false, true)
    }
    vB_Editor[this.editorid].button_context(this, A.type)
};
vB_Text_Editor_Events.prototype.formatting_select_onchange = function (B) {
    var A = this.options[this.selectedIndex].value;
    if (A != "") {
        vB_Editor[this.editorid].format(B, this.cmd, A)
    }
    this.selectedIndex = 0
};
vB_Text_Editor_Events.prototype.smilieselect_onchange = function (A) {
    if (this.options[this.selectedIndex].value != "") {
        vB_Editor[this.editorid].insert_smilie(A, this.options[this.selectedIndex].value, this.options[this.selectedIndex].smiliepath, this.options[this.selectedIndex].smilieid)
    }
    this.selectedIndex = 0
};
vB_Text_Editor_Events.prototype.attachselect_onchange = function (B) {
    var A = this.options[this.selectedIndex].value;
    if (A != "") {
        vB_Editor[this.editorid].wrap_tags("attach", false, A)
    }
    this.selectedIndex = 0
};
vB_Text_Editor_Events.prototype.attachselect_onmouseover = function (A) {
    if (this.options.length <= 2) {
        vB_Editor[this.editorid].build_attachments_popup(this);
        return true
    }
};
vB_Text_Editor_Events.prototype.menuoption_onmouseevent = function (A) {
    A = do_an_e(A);
    vB_Editor[this.editorid].button_context(this, A.type, "menu")
};
vB_Text_Editor_Events.prototype.formatting_option_onclick_font = function (A) {
    vB_Editor[this.editorid].format(A, this.cmd, this.firstChild.innerHTML);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.formatting_option_onclick_size = function (A) {
    vB_Editor[this.editorid].format(A, this.cmd, this.firstChild.firstChild.innerHTML);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.coloroption_onclick = function (A) {
    fetch_object(this.editorid + "_color_bar").style.backgroundColor = this.colorname;
    vB_Editor[this.editorid].format(A, this.cmd, this.colorname);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.colorout_onclick = function (A) {
    A = do_an_e(A);
    vB_Editor[this.editorid].format(A, "forecolor", fetch_object(this.editorid + "_color_bar").style.backgroundColor);
    return false
};
vB_Text_Editor_Events.prototype.smilieoption_onclick = function (A) {
    vB_Editor[this.editorid].button_context(this, "mouseout", "menu");
    vB_Editor[this.editorid].insert_smilie(A, this.smilietext, fetch_tags(this, "img")[0].src, this.smilieid);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.smiliemore_onclick = function (A) {
    vB_Editor[this.editorid].open_smilie_window(smiliewindow_x, smiliewindow_y);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.attachmanage_onclick = function (A) {
    YAHOO.vBulletin.vBPopupMenu.close_all();
    if (typeof (vB_Attachments) != "undefined") {
        vB_Attachments.attachmanage()
    }
};
vB_Text_Editor_Events.prototype.attachoption_onclick = function (A) {
    vB_Editor[this.editorid].button_context(this, "mouseout", "menu");
    vB_Editor[this.editorid].wrap_tags("attach", false, this.attachmentid);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.attachinsertall_onclick = function (C) {
    var B = "";
    var A = (vB_Editor[this.editorid].wysiwyg_mode ? "<br /><br />" : "\r\n\r\n");
    for (var D in vB_Attachments.attachments) {
        if (YAHOO.lang.hasOwnProperty(vB_Attachments.attachments, D)) {
            B += B != "" ? A : "";
            B += "[ATTACH]" + D + "[/ATTACH]"
        }
    }
    vB_Editor[this.editorid].insert_text(B);
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.smiliewindow_onunload = function (A) {
    if (typeof smilie_window != "undefined" && !smilie_window.closed) {
        smilie_window.close()
    }
};
vB_Text_Editor_Events.prototype.editwin_onfocus = function (A) {
    this.hasfocus = true
};
vB_Text_Editor_Events.prototype.editwin_onblur = function (A) {
    this.hasfocus = false
};
vB_Text_Editor_Events.prototype.editdoc_onmousemove = function (D) {
    var C = YAHOO.util.Event.getTarget(D);
    var A = YAHOO.util.Event.getRelatedTarget(D);
    try {
        if (YAHOO.util.Dom.hasClass(C, "previewthumbedit") || this.activeimg == C) {
            return
        }
    } catch (D) {
        this.remove_activeimg();
        return
    }
    this.remove_activeimg();
    if (YAHOO.util.Dom.hasClass(C, "previewthumb")) {
        YAHOO.util.Dom.addClass(C, "previewthumbactive");
        var E = this.editdoc.body.appendChild(this.editdoc.createElement("img"));
        YAHOO.util.Dom.addClass(E, "previewthumbedit");
        E.src = BBURL + "/" + IMGDIR_MISC + "/pencil.png";
        var B = YAHOO.util.Dom.getXY(C);
        YAHOO.util.Dom.setXY(E, B);
        this.activeimg = C
    }
};
vB_Text_Editor_Events.prototype.editdoc_ondragdrop = function (B) {
    var A = YAHOO.util.Dom.getElementsByClassName("previewthumb", "img", this.editdoc);
    var C = false;
    for (i = 0; i < A.length; i++) {
        if (C = PHP.stripos(A[i].src, "attachment.php")) {
            A[i].src = A[i].src.substr(C)
        }
    }
};
vB_Text_Editor_Events.prototype.editdoc_onmousedown = function (B) {
    var A = YAHOO.util.Event.getTarget(B);
    try {
        if (YAHOO.util.Dom.hasClass(A, "previewthumbedit")) {
            YAHOO.util.Event.stopEvent(B)
        }
    } catch (B) {
        return
    }
};
vB_Text_Editor_Events.prototype.editdoc_onclick = function (D) {
    this.check_focus();
    var C = YAHOO.util.Event.getTarget(D);
    if (YAHOO.util.Dom.hasClass(C, "previewthumbedit")) {
        this.create_editor_dialog('<img src="' + IMGDIR_MISC + '/lightbox_progress.gif" alt="" />', this.insertimagesettings_confirm);
        var A = this.activeimg.src.match(/attachmentid=(\d+)/i);
        var B = parseInt(A[1]);
        YAHOO.util.Connect.asyncRequest("POST", "ajax.php?do=fetchhtml_imagesettings", {
            success: this.insertimagesettings_ajax,
            failure: this.insertimagesettings_failure,
            timeout: vB_Default_Timeout,
            argument: [this.editorid],
            scope: this
        }, SESSIONURL + "&securitytoken=" + SECURITYTOKEN + "&ajax=1&do=fetchhtml_imagesettings&attachmentid=" + B)
    }
};
vB_Text_Editor_Events.prototype.editdoc_onmouseup = function (A) {
    vB_Editor[this.editorid].set_context();
    YAHOO.vBulletin.vBPopupMenu.close_all()
};
vB_Text_Editor_Events.prototype.editdoc_onkeyup = function (A) {
    vB_Editor[this.editorid].set_context()
};
vB_Text_Editor_Events.prototype.editdoc_onkeypress = function (C) {
    if (!C) {
        C = window.event
    }
    if (C.ctrlKey && !C.altKey) {
        if (vB_Editor[this.editorid].allowbasicbbcode == false) {
            return
        }
        var A = C.charCode ? C.charCode : C.keyCode;
        var B;
        switch (String.fromCharCode(A).toLowerCase()) {
        case "b":
            B = "bold";
            break;
        case "i":
            B = "italic";
            break;
        case "u":
            B = "underline";
            break;
        default:
            return
        }
        C = do_an_e(C);
        vB_Editor[this.editorid].apply_format(B, false, null);
        return false
    } else {
        if (C.keyCode == 9) {
            if (C.shiftKey || (C.modifiers && (C.modifiers & 4))) {
                return
            }
            if (is_opera) {
                return
            }
            if (fetch_object("tag_add_input") != null) {
                fetch_object("tag_add_input").focus()
            } else {
                if (fetch_object("rb_iconid_0") != null) {
                    fetch_object("rb_iconid_0").focus()
                } else {
                    if (fetch_object(this.editorid + "_save") != null) {
                        fetch_object(this.editorid + "_save").focus()
                    } else {
                        if (fetch_object("qr_submit") != null) {
                            fetch_object("qr_submit").focus()
                        } else {
                            return
                        }
                    }
                }
            }
            C = do_an_e(C);
            return
        }
    }
};
vB_Text_Editor_Events.prototype.editdoc_onresizestart = function (A) {
    if (A.srcElement.tagName == "IMG") {
        return false
    }
};

function save_iframe_to_textarea() {
    for (var A in vB_Editor) {
        if (!YAHOO.lang.hasOwnProperty(vB_Editor, A)) {
            continue
        }
        if (vB_Editor[A].wysiwyg_mode && vB_Editor[A].initialized) {
            vB_Editor[A].textobj.value = vB_Editor[A].get_editor_contents()
        }
    }
}
if (window.attachEvent) {
    window.attachEvent("onbeforeunload", save_iframe_to_textarea)
} else {
    if (window.addEventListener) {
        window.addEventListener("unload", save_iframe_to_textarea, true)
    }
}

function switch_editor_mode(A) {
    if (AJAX_Compatible) {
        if (vB_Editor[A].influx == 1) {
            return
        } else {
            vB_Editor[A].influx = 1
        }
        YAHOO.vBulletin.vBPopupMenu.close_all();
        vB_Editor[A].switch_editor_ajax()
    }
}

function do_switch_editor_mode(H) {
    if (H.responseXML) {
        var A = H.argument[0];
        var B = vB_Editor[A].parsetype;
        var F = vB_Editor[A].parsesmilies;
        var I = vB_Editor[A].ajax_extra;
        vB_Editor[A].destroy();
        var G = H.responseXML.getElementsByTagName("message")[0];
        if (typeof G != "undefined") {
            G = G.firstChild
        }
        var C = (G ? G.nodeValue : "");
        var E = C.match(/&#([0-9]+);/g);
        if (E) {
            for (var D = 0; typeof E[D] != "undefined"; D++) {
                if (submatch = E[D].match(/^&#([0-9]+);$/)) {
                    C = C.replace(submatch[0], String.fromCharCode(submatch[1]))
                }
            }
        }
        vB_Editor[A] = vB_Editor[A].recreate_editor(A, H.argument[1], B, F, C, I);
        vB_Editor[A].check_focus();
        fetch_object(A + "_mode").value = H.argument[1];
        custom_editor_events.editor_switch.fire(vB_Editor[A])
    }
}
//var contextcontrols = new Array("bold", "italic", "underline", "justifyleft", "justifycenter", "justifyright", "insertorderedlist", "insertunorderedlist");
var contextcontrols = new Array("bold", "italic", "underline", "justifyleft", "justifycenter", "justifyright", "insertorderedlist", "insertunorderedlist" ,"switchmode");

function vB_History() {
    this.cursor = -1;
    this.stack = new Array()
}
vB_History.prototype.move_cursor = function (A) {
    var B = this.cursor + A;
    if (B >= 0 && this.stack[B] != null && typeof this.stack[B] != "undefined") {
        this.cursor += A
    }
};
vB_History.prototype.add_snapshot = function (A) {
    if (this.stack[this.cursor] == A) {
        return
    } else {
        this.cursor++;
        this.stack[this.cursor] = A;
        if (typeof this.stack[this.cursor + 1] != "undefined") {
            this.stack[this.cursor + 1] = null
        }
    }
};
vB_History.prototype.get_snapshot = function () {
    if (typeof this.stack[this.cursor] != "undefined" && this.stack[this.cursor] != null) {
        return this.stack[this.cursor]
    } else {
        return false
    }
};