window["form_validator"] = window["form_validator"] || {

	options : null,

	exclamationImg : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AIHEDcohBNxRQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAvElEQVQ4y62TTQqDMBCFv8Qsu1Ra8A7idbryytJNL9BNtgV1U6ddNMKgY6DYB4Ehb+ZNMj8OAwIN0ALndBWB3sONHARqgSgwC7xXZ05cvRfc7QRaQp2VeR08KX4yRGotEI1Mo+JHg48APhWs5HeUAk1I1faGgxc4LbbFA21QrVqjAC7KtlCFzBMLoAJcRqAMaUgsOOAKPJNt4R6A/lvozT9fwEPZYTs69Lk2Dspz2Gvjfwbp8CgfWSZ3dJ0/kSXCTm81zRsAAAAASUVORK5CYII=",

	init : function(options)
	{
		this.options = options;

		if(this.options.enable_disposables_check)
			this.loadDisposableEmailDomains();

		//find all forms
		for(var i = 0; i < options.forms.length; i++)
		{
			var form = options.forms[i];
			var formElement = $(form.selector);

			if(formElement.length > 0)
				this.attachChecks(formElement,form.callback);
		}
	},

	loadDisposableEmailDomains : function()
	{
		var self = this;
		jQuery.getJSON("https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json",function(data){
			self.disposable_email_domains = data;
			console.log("disposable list loaded");
		}).error(function(){
			//do nothing.
		});
	},

	attachChecks : function(frm,callback)
	{
		var fields = frm.find("input,select,textarea");

		for(var i=0; i<fields.length; i++)
		{
			if($(fields[i]).attr("type") == 'submit')
				continue;

			$(fields[i]).focus(this.clean);
			$(fields[i]).blur(this.check);

			console.log(fields[i]);
		};


		var submit = frm.find("input[type='submit'], button[type='submit']");
		var self = this;
		submit.click(function(ev)
		{
			ev.preventDefault();
			self.validateForm(ev,callback);
		} );
	},

	validateForm : function (ev,callback)
	{
		console.log('validating form');

		var form = $(ev.target).closest("form");

		var fields = form.find("input,select,textarea");

		var failed = false;
		for(var i=0; i<fields.length; i++)
		{
			if($(fields[i]).attr("type") == 'submit')
				continue;

			if( !window.form_validator.doCheck(fields[i]))
				failed = true;
		};

		if(!failed)
			callback(true);
	},

	//support event based (blur) of doCheck
	check : function()
	{
		window.form_validator.doCheck(this);
	},

	doCheck : function(field)
	{
		console.log("checking: "+field.name);

		field = $(field);
		var val = field.val() ? field.val().trim() : "";
		var type = field.prop("type");
		type = type || "unknown";

		if(field.prop("required"))
		{
			if(val.length == 0 || (type == 'checkbox' && !field.is(":checked")))
			{
				window.form_validator.showError(field,"mandatory_field");
				return false;
			}
		}

		if(val.length > 0)
		{
			switch (type) {
				case 'email':
					if (!window.form_validator.checkEmail(field, val))
						return false;
					break;
				case 'tel':
					if (!window.form_validator.checkPhone(field, val))
						return false;
					break;
				case 'text':
					if(field.prop('list'))
					{
						if(!window.form_validator.checkList(field,val))
							return false;
					}
					break;
			}
		}

		return true;
	},

	checkList : function(field,val)
	{
		var options = $(field.prop("list")).find("option");

		for(var i = 0; i < options.length; i++)
			if($(options[i]).val().toLowerCase() == val.toLowerCase())
				return true;

		this.showError(field,"invalid_list_value");
		return false;
	},

	checkPhone : function(field,val)
	{
		var phoneRE = /^\+?[\d\. \-\(\)]{7,}$/g;
		var nakedPhone = val.replace(/\D/g, '');
		if(val.length > 0 && (!phoneRE.test(val) || nakedPhone.length < 7 || nakedPhone.length > 12))
		{
			this.showError(field,"wrong_phone_format");
			return false;
		}

		return true;
	},

	checkEmail : function(field,val)
	{
		//regular expression check
		var emailRE = /^([\w\.\-_]+)?\w+@[\w\-\_]+(\.\w+){1,}$/ig;
		if(val.length > 0 && !emailRE.test(val))
		{
			this.showError(field,"invalid_email_address");
			return false;
		}

		//disposable email domain check
		var domain =val.substr(val.indexOf("@") + 1).trim();
		if(val.length > 0 && this.options.enable_disposables_check && this.disposable_email_domains && this.disposable_email_domains.indexOf(domain) >= 0)
		{
			field.status = 'failed';
			this.showError(field,"invalid_email_address");
			return false;
		}

		return true;
	},

	showError : function(field,message)
	{
		field.css("background-color","#FFDECA");
		var fieldName = field.prop("name");
		console.log(fieldName+" "+message);

		var pos = field.offset();
		var height = field.outerHeight();
		var width = field.outerWidth();

		field.parent().append("<span field-name='"+fieldName+"'><img src='"+window.form_validator.exclamationImg+"' /></span>");

		var top = (pos.top + (height - 16) / 2);
		var left = pos.left + width - 20;

		$("span[field-name='"+fieldName+"']").css({"position":"absolute",top:top,left:left});

	},

	clean : function()
	{
		var field = $(this);
		var fieldName = field.prop("name");

		console.log("cleaning :"+fieldName);

		field.css("background-color", "");
		$("span[field-name='"+fieldName+"']").remove();
	}
}