# form-validator
A general purpose validation script for lead forms

### What it does:
Form validator identifies form elements on your webpage, and attach simple validations to each fields, during focus and blur, and during the submit action.
It currently checks for:
* Required fields
* Email fields
* Phone fields
and will not submit the form unless all fields pass validity checks.

### How to use:

Link your page to the form-validator.js script and then deploy the script below at the bottom of your page, above the </body> tag.
	<script>
		var options = {
	        forms: [{  /* notice the array, you can assign several forms */
	        selector : "#frmDetails", /* this is where you tell the script how to find the form. */
	        callback : validationDone /* the callback function when all validations pass successfully */
	        }],
	    enable_disposables_check : true /* This option allow you to check for temporary email services used as email address */
	    };

	    window.form_validator.init(options);

	    function validationDone(success) /* this function should submit the lead to the lead collection system, and/or redirect to a thank you page */
		{
			alert(success ? "Yes" : "No");
		}
	</script>


