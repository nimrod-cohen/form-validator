window["form_validator"] = window["form_validator"] || {

	options : null,
	disposable_email_domains : null,
	$ : null,

	exclamationImg : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AIHEDcohBNxRQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAvElEQVQ4y62TTQqDMBCFv8Qsu1Ra8A7idbryytJNL9BNtgV1U6ddNMKgY6DYB4Ehb+ZNMj8OAwIN0ALndBWB3sONHARqgSgwC7xXZ05cvRfc7QRaQp2VeR08KX4yRGotEI1Mo+JHg48APhWs5HeUAk1I1faGgxc4LbbFA21QrVqjAC7KtlCFzBMLoAJcRqAMaUgsOOAKPJNt4R6A/lvozT9fwEPZYTs69Lk2Dspz2Gvjfwbp8CgfWSZ3dJ0/kSXCTm81zRsAAAAASUVORK5CYII=",

	init : function(options)
	{
		this.$ = $ || jQuery;
		this.options = options;

		if(this.options.enable_disposables_check)
			this.loadDisposableEmailDomains();

		this.addForms(this.options.forms)
	},

	//for lazy loading
	addForms : function (forms)
	{
		//find all forms
		for(var i = 0; i < forms.length; i++)
		{
			var form = forms[i];
			var formElement = this.$(form.selector);

			formElement.attr("novalidate","novalidate");

			if(formElement.length > 0)
				this.attachChecks(formElement,form.callback);
		}
	},

	loadDisposableEmailDomains : function()
	{
		if(this.disposable_email_domains != null)
			return;

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
			if(this.$(fields[i]).attr("type") == 'submit')
				continue;

			this.$(fields[i]).focus(this.doClean);
			this.$(fields[i]).blur(this.doCheck);

			console.log(fields[i]);
		};


		var submit = frm.find("input[type='submit'], button[type='submit']");
		var self = this;
		submit.click(function(ev)
		{
			ev.preventDefault();
			self.validateForm(ev,callback);
			return false; //required for safari.
		} );
	},

	validateForm : function (ev,callback)
	{
		var self = window.form_validator;
		console.log('validating form');

		var form = self.$(ev.target).closest("form");

		var fields = form.find("input,select,textarea");

		var failed = false;
		for(var i=0; i<fields.length; i++)
		{
			if(self.$(fields[i]).attr("type") == 'submit')
				continue;

			self.cleanField(self.$(fields[i]));
			if( !self.checkField(self.$(fields[i])))
				failed = true;
		};

		if(!failed)
			callback(form.get(0));
	},

	//support event based (blur) of doCheck
	doCheck : function()
	{
		var self = window.form_validator;
		self.checkField(self.$(this));
	},

	checkField : function(field)
	{
		console.log("checking: "+field.attr("name"));

		var val = field.val() ? field.val().trim() : "";
		var type = field.attr("type");
		type = type || "unknown";

		if(field.attr("required"))
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
					if(field.attr('list'))
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
		var self = window.form_validator;

		var options = self.$(field.attr("list")).find("option");

		for(var i = 0; i < options.length; i++)
			if(self.$(options[i]).val().toLowerCase() == val.toLowerCase())
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
		var self = window.form_validator;
		var leftAligned = field.css("direction") == "rtl";

		var bg = self.options.error_background ? self.options.error_background : "rgba(255,0,0,0.1)";
		field.css("background-color",bg);
		var fieldName = field.attr("name");
		console.log(fieldName+" "+message);

		var pos = field.position();
		var height = field.outerHeight();
		var width = field.outerWidth();

		var errorFieldId = "err_" + (Math.floor(Math.random() * (1000000 - 1000 + 1)) + 1000);
		field.attr("error-id",errorFieldId);

		field.parent().append("<span id='"+errorFieldId+"' field-name='"+fieldName+"'><img src='"+self.exclamationImg+"' /></span>");

		var top = (pos.top + (height - 16) / 2);
		var left = pos.left + (leftAligned ? 20 : width - 20);

		self.$("span#"+errorFieldId).css({"position":"absolute","top":top,"left":left,"z-index":"100000"});
	},

	cleanField : function (field)
	{
		var self = window.form_validator;
		var fieldName = field.attr("name");
		var errorFieldId = field.attr("error-id");

		if(typeof errorFieldId === "undefined")
			return;

		console.log("cleaning :"+fieldName);

		field.css("background-color", "");
		self.$("span#"+errorFieldId).remove();
		field.removeAttr("error-id");
	},

	doClean : function()
	{
		var self = window.form_validator;
		self.cleanField(self.$(this));
	}
}