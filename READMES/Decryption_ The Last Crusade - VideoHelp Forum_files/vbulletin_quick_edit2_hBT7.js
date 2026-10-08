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

function vB_AJAX_QuickEdit_Init(C) {
    if (AJAX_Compatible) {
        if (typeof C == "string") {
            C = fetch_object(C)
        }
        var B = fetch_tags(C, "a");
        for (var A = 0; A < B.length; A++) {
            if (B[A].name && B[A].name.indexOf("vB::QuickEdit::") != -1) {
                B[A].onclick = vB_AJAX_QuickEditor_Events.prototype.editbutton_click
            }
        }
    }
}

function vB_AJAX_QuickEditor() {
    this.editimgsrc = null;
    this.postid = null;
    this.messageobj = null;
    this.container = null;
    this.originalhtml = null;
    this.editstate = false;
    this.editorcounter = 0;
    this.ajax_req = null;
    this.show_advanced = true;
    vBulletin.attachinfo = {
        posthash: "",
        poststarttime: ""
    }
}
vB_AJAX_QuickEditor.prototype.ready = function () {
    if (this.editstate || YAHOO.util.Connect.isCallInProgress(this.ajax_req)) {
        return false
    } else {
        return true
    }
};
vB_AJAX_QuickEditor.prototype.edit = function (A) {
    if (typeof vb_disable_ajax != "undefined" && vb_disable_ajax > 0) {
        return true
    }
    var B = A.substr(A.lastIndexOf("::") + 2);
    if (YAHOO.util.Connect.isCallInProgress(this.ajax_req)) {
        return false
    } else {
        if (!this.ready()) {
            if (this.postid == B) {
                this.full_edit();
                return false
            }
            this.abort()
        }
    }
    this.editorcounter++;
    this.editorid = "vB_Editor_QE_" + this.editorcounter;
    this.postid = B;
    this.messageobj = fetch_object("post_message_" + this.postid);
    this.originalhtml = this.messageobj.innerHTML;
    this.unchanged = null;
    this.unchanged_reason = null;
    this.fetch_editor();
    this.editstate = true;
    return false
};
vB_AJAX_QuickEditor.prototype.fetch_editor = function () {
    if (YAHOO.util.Dom.get("progress_" + this.postid)) {
        this.editimgsrc = YAHOO.util.Dom.get("editimg_" + this.postid).getAttribute("src");
        YAHOO.util.Dom.get("editimg_" + this.postid).setAttribute("src", YAHOO.util.Dom.get("progress_" + this.postid).getAttribute("src"))
    }
    document.body.style.cursor = "wait";
    YAHOO.util.Connect.asyncRequest("POST", "ajax.php?do=quickedit&p=" + this.postid, {
        success: this.display_editor,
        failure: this.error_opening_editor,
        timeout: vB_Default_Timeout,
        scope: this
    }, SESSIONURL + "securitytoken=" + SECURITYTOKEN + "&do=quickedit&p=" + this.postid + "&editorid=" + PHP.urlencode(this.editorid))
};
vB_AJAX_QuickEditor.prototype.error_opening_editor = function (A) {
    vBulletin_AJAX_Error_Handler(A);
    window.location = "editpost.php?" + SESSIONURL + "do=editpost&postid=" + this.postid
};
vB_AJAX_QuickEditor.prototype.handle_save_error = function (A) {
    vBulletin_AJAX_Error_Handler(A);
    this.show_advanced = false;
    this.full_edit()
};
vB_AJAX_QuickEditor.prototype.display_editor = function (F) {
    if (F.responseXML) {
        if (YAHOO.util.Dom.get("progress_" + vB_QuickEditor.postid)) {
            YAHOO.util.Dom.get("editimg_" + this.postid).setAttribute("src", vB_QuickEditor.editimgsrc)
        }
        document.body.style.cursor = "auto";
        if (fetch_tag_count(F.responseXML, "disabled")) {
            window.location = "editpost.php?" + SESSIONURL + "do=editpost&postid=" + this.postid
        } else {
            if (fetch_tag_count(F.responseXML, "error")) {} else {
                if (F.responseXML.getElementsByTagName("contenttypeid").length > 0) {
                    vBulletin.attachinfo = {
                        contenttypeid: F.responseXML.getElementsByTagName("contenttypeid")[0].firstChild.nodeValue,
                        userid: F.responseXML.getElementsByTagName("userid")[0].firstChild.nodeValue,
                        attachlimit: F.responseXML.getElementsByTagName("attachlimit")[0].firstChild.nodeValue,
                        max_file_size: F.responseXML.getElementsByTagName("max_file_size")[0].firstChild.nodeValue,
                        auth_type: F.responseXML.getElementsByTagName("auth_type")[0].firstChild.nodeValue,
                        posthash: F.responseXML.getElementsByTagName("posthash")[0].firstChild.nodeValue,
                        poststarttime: F.responseXML.getElementsByTagName("poststarttime")[0].firstChild.nodeValue
                    };
                    var B = F.responseXML.getElementsByTagName("values");
                    if (B.length > 0 && B[0].childNodes.length) {
                        vBulletin.attachinfo.values = {};
                        for (var D = 0; D < B[0].childNodes.length; D++) {
                            if (B[0].childNodes[D].nodeName != "#text" && typeof (B[0].childNodes[D].childNodes[0]) != "undefined") {
                                vBulletin.attachinfo.values[B[0].childNodes[D].nodeName] = B[0].childNodes[D].childNodes[0].nodeValue
                            }
                        }
                    }
                    var A = F.responseXML.getElementsByTagName("phrases");
                    if (A.length > 0 && A[0].childNodes.length) {
                        for (var D = 0; D < A[0].childNodes.length; D++) {
                            if (A[0].childNodes[D].nodeName != "#text" && typeof (A[0].childNodes[D].childNodes[0]) != "undefined") {
                                vbphrase[A[0].childNodes[D].nodeName] = A[0].childNodes[D].childNodes[0].nodeValue
                            }
                        }
                    }
                }
                var E = fetch_tags(F.responseXML, "editor")[0];
                if (typeof E == "undefined") {
                    window.location = "editpost.php?" + SESSIONURL + "do=editpost&postid=" + this.postid;
                    return false
                }
                var G = E.getAttribute("reason");
                this.messageobj.innerHTML = E.firstChild.nodeValue;
                if (fetch_object(this.editorid + "_edit_reason")) {
                    this.unchanged_reason = PHP.unhtmlspecialchars(G);
                    fetch_object(this.editorid + "_edit_reason").value = this.unchanged_reason;
                    fetch_object(this.editorid + "_edit_reason").onkeypress = vB_AJAX_QuickEditor_Events.prototype.reason_key_trap
                }
                vB_Editor[this.editorid] = new vB_Text_Editor(this.editorid, E.getAttribute("mode"), E.getAttribute("parsetype"), E.getAttribute("parsesmilies"));
                if (fetch_object(this.editorid + "_editor") && fetch_object(this.editorid + "_editor").scrollIntoView) {
                    fetch_object(this.editorid + "_editor").scrollIntoView(true)
                }
                vB_Editor[this.editorid].set_editor_width("100%", true);
                vB_Editor[this.editorid].check_focus();
                this.unchanged = vB_Editor[this.editorid].get_editor_contents();
                YAHOO.util.Event.on(YAHOO.util.Dom.get(this.editorid + "_save"), "click", this.save, this, true);
                YAHOO.util.Event.on(YAHOO.util.Dom.get(this.editorid + "_abort"), "click", this.abort, this, true);
                YAHOO.util.Event.on(YAHOO.util.Dom.get(this.editorid + "_adv"), "click", this.full_edit, this, true);
                YAHOO.util.Event.on("quick_edit_errors_hide", "click", this.hide_errors, this, true);
                YAHOO.util.Event.on("quick_edit_errors_cancel", "click", this.abort, this, true);
                var C = YAHOO.util.Dom.get(this.editorid + "_delete");
                if (C) {
                    YAHOO.util.Event.on(this.editorid + "_delete", "click", this.show_delete, this, true)
                }
            }
        }
        handle_dep(this.editorid)
    }
};
vB_AJAX_QuickEditor.prototype.restore = function (C, A) {
    this.hide_errors(true);
    if (this.editorid && vB_Editor[this.editorid] && vB_Editor[this.editorid].initialized) {
        vB_Editor[this.editorid].destroy()
    }
    if (A == "tableobj") {
        var B = YAHOO.util.Dom.get("post_" + this.postid);
        B.parentNode.replaceChild(string_to_node(C), B)
    } else {
        this.messageobj.innerHTML = C
    }
    this.editstate = false
};
vB_AJAX_QuickEditor.prototype.abort = function (A) {
    if (A) {
        YAHOO.util.Event.stopEvent(A)
    }
    if (YAHOO.util.Dom.get("progress_" + vB_QuickEditor.postid) && vB_QuickEditor.editimgsrc) {
        YAHOO.util.Dom.get("editimg_" + vB_QuickEditor.postid).setAttribute("src", vB_QuickEditor.editimgsrc)
    }
    document.body.style.cursor = "auto";
    vB_QuickEditor.restore(vB_QuickEditor.originalhtml, "messageobj");
    PostBit_Init(fetch_object("post_" + vB_QuickEditor.postid), vB_QuickEditor.postid)
};
vB_AJAX_QuickEditor.prototype.full_edit = function (B) {
    var A = new vB_Hidden_Form("editpost.php?do=updatepost&postid=" + vB_QuickEditor.postid+ "&posthash=" + vBulletin.attachinfo.posthash + "&poststarttime=" + vBulletin.attachinfo.poststarttime);
    A.add_variable("do", "updatepost");
    A.add_variable("s", fetch_sessionhash());
    A.add_variable("securitytoken", SECURITYTOKEN);
    if (vB_QuickEditor.show_advanced) {
        A.add_variable("advanced", 1)
    } else {
        A.add_variable("quickeditnoajax", 1)
    }
    A.add_variable("postid", vB_QuickEditor.postid);
    A.add_variable("wysiwyg", vB_Editor[vB_QuickEditor.editorid].wysiwyg_mode);
    A.add_variable("message", vB_Editor[vB_QuickEditor.editorid].get_editor_contents());
    A.add_variable("reason", fetch_object(vB_QuickEditor.editorid + "_edit_reason").value);
    A.submit_form()
};
vB_AJAX_QuickEditor.prototype.save = function (B) {
    var C = vB_Editor[vB_QuickEditor.editorid].get_editor_contents();
    var A = vB_Editor[vB_QuickEditor.editorid];
    if (C == vB_QuickEditor.unchanged && A == vB_QuickEditor.unchanged_reason) {
        vB_QuickEditor.abort(B)
    } else {
        fetch_object(vB_QuickEditor.editorid + "_posting_msg").style.display = "";
        document.body.style.cursor = "wait";
        pc_obj = fetch_object("postcount" + vB_QuickEditor.postid);
        this.ajax_req = YAHOO.util.Connect.asyncRequest("POST", "editpost.php?do=updatepost&postid=" + this.postid+ "&posthash=" + vBulletin.attachinfo.posthash + "&poststarttime=" + vBulletin.attachinfo.poststarttime, {
            success: vB_QuickEditor.update,
            failure: vB_QuickEditor.handle_save_error,
            timeout: vB_Default_Timeout,
            scope: vB_QuickEditor
        }, SESSIONURL + "securitytoken=" + SECURITYTOKEN + "&do=updatepost&ajax=1&postid=" + vB_QuickEditor.postid + "&posthash=" + vBulletin.attachinfo.posthash + "&poststarttime=" + vBulletin.attachinfo.poststarttime + "&wysiwyg=" + vB_Editor[vB_QuickEditor.editorid].wysiwyg_mode + "&message=" + PHP.urlencode(C) + "&reason=" + PHP.urlencode(fetch_object(vB_QuickEditor.editorid + "_edit_reason").value) + (pc_obj != null ? "&postcount=" + PHP.urlencode(pc_obj.name) : ""));
        vB_QuickEditor.pending = true
    }
};
vB_AJAX_QuickEditor.prototype.show_delete = function () {
    vB_QuickEditor.deletedialog = fetch_object("quickedit_delete");
    if (vB_QuickEditor.deletedialog && vB_QuickEditor.deletedialog.style.display != "") {
        vB_QuickEditor.deletedialog.style.display = "";
        vB_QuickEditor.deletebutton = fetch_object("quickedit_dodelete");
        vB_QuickEditor.deletebutton.onclick = vB_QuickEditor.delete_post;
        if (fetch_object("del_reason")) {
            fetch_object("del_reason").onkeypress = vB_AJAX_QuickEditor_Events.prototype.delete_items_key_trap
        }
    }
};
vB_AJAX_QuickEditor.prototype.delete_post = function () {
    var A = fetch_object("rb_del_leave");
    if (A && A.checked) {
        vB_QuickEditor.abort();
        return
    }
    var B = new vB_Hidden_Form("editpost.php");
    B.add_variable("do", "deletepost");
    B.add_variable("s", fetch_sessionhash());
    B.add_variable("securitytoken", SECURITYTOKEN);
    B.add_variable("postid", vB_QuickEditor.postid);
    B.add_variables_from_object(vB_QuickEditor.deletedialog);
    B.submit_form()
};
vB_AJAX_QuickEditor.prototype.update = function (C) {
    if (C.responseXML) {
        vB_QuickEditor.pending = false;
        document.body.style.cursor = "auto";
        fetch_object(vB_QuickEditor.editorid + "_posting_msg").style.display = "none";
        if (fetch_tag_count(C.responseXML, "error")) {
            var D = fetch_tags(C.responseXML, "error");
            var A = "<ol>";
            for (var B = 0; B < D.length; B++) {
                A += "<li>" + D[B].firstChild.nodeValue + "</li>"
            }
            A += "</ol>";
            vB_QuickEditor.show_errors(A)
        } else {
            vB_QuickEditor.restore(C.responseXML.getElementsByTagName("postbit")[0].firstChild.nodeValue, "tableobj");
            PostBit_Init(fetch_object("post_" + vB_QuickEditor.postid), vB_QuickEditor.postid)
        }
    }
    return false
};
vB_AJAX_QuickEditor.prototype.show_errors = function (A) {
    set_unselectable("quick_edit_errors_hide");
    YAHOO.util.Dom.get("ajax_post_errors_message").innerHTML = A;
    var B = YAHOO.util.Dom.get("ajax_post_errors");
    var C = (is_saf ? "body" : "documentElement");
    B.style.left = (is_ie ? document.documentElement.clientWidth : self.innerWidth) / 2 - 200 + document[C].scrollLeft + "px";
    B.style.top = (is_ie ? document.documentElement.clientHeight : self.innerHeight) / 2 - 150 + document[C].scrollTop + "px";
    YAHOO.util.Dom.removeClass(B, "hidden")
};
vB_AJAX_QuickEditor.prototype.hide_errors = function (A) {
    this.errors = false;
    YAHOO.util.Dom.addClass("ajax_post_errors", "hidden");
    if (A != true) {
        vB_Editor[this.editorid].check_focus()
    }
};

function vB_AJAX_QuickEditor_Events() {}
vB_AJAX_QuickEditor_Events.prototype.editbutton_click = function (A) {
    return vB_QuickEditor.edit(this.name)
};
vB_AJAX_QuickEditor_Events.prototype.delete_button_handler = function (A) {
    if (this.id == "rb_del_leave" && this.checked) {
        vB_QuickEditor.deletebutton.disabled = true
    } else {
        vB_QuickEditor.deletebutton.disabled = false
    }
};
vB_AJAX_QuickEditor_Events.prototype.reason_key_trap = function (A) {
    A = A ? A : window.event;
    switch (A.keyCode) {
    case 9:
        fetch_object(vB_QuickEditor.editorid + "_save").focus();
        return false;
        break;
    case 13:
        vB_QuickEditor.save();
        return false;
        break;
    default:
        return true
    }
};
vB_AJAX_QuickEditor_Events.prototype.delete_items_key_trap = function (A) {
    A = A ? A : window.event;
    if (A.keyCode == 13) {
        if (vB_QuickEditor.deletebutton.disabled == false) {
            vB_QuickEditor.delete_post()
        }
        return false
    }
    return true
};
var vB_QuickEditor = new vB_AJAX_QuickEditor();