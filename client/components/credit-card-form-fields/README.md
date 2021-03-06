# CreditCardFormFields

`CreditCardFormFields` is a React component that is used to display a credit card form body with the following input fields:

- Credit card number
- Credit card expiration date
- Credit card verification code, also known as [CVV](https://en.wikipedia.org/wiki/Card_security_code)
- Credit card holder name
- Credit card holder country
- Credit card holder postal Code

Some of these fields use [masking](https://en.wikipedia.org/wiki/Input_mask), i.e. rules that govern what a user is allowed to enter in a text box.

Brazil requires that users provide additional details when making payments. When a user selects Brazil from the country select menu, extra fields will appear:

- Tax identification code, also known as [CPF](https://en.wikipedia.org/wiki/Cadastro_de_Pessoas_F%C3%ADsicas)
- Phone number
- Address, city and state details

## Usage

```jsx
import React, { Component } from 'react';
import CreditCardFormFields from 'calypso/components/credit-card-form-fields';

class YourComponent extends Component {
	render() {
		return (
			<CreditCardFormFields
				card={ this.props.card }
				countriesList={ this.props.countriesList }
				eventFormName="Credit Card Form"
				isFieldInvalid={ this.isFieldInvalid }
				onFieldChange={ this.onFieldChange }
			/>
		);
	}
}
```

## Properties

This component makes use of the following properties, which are all required:

### `card`

An object containing a set of input fields as key/value pairs.

### `countriesList`

An object containing a set of countries as code/name pairs.

### `eventFormName`

A string used to distinguish events generated by this form in analytics.

### `isFieldInvalid`

A function that checks if a given field is valid or not. The function is passed the corresponding field name.

### `onFieldChange`

A function invoked when the value of an input field changes. This provides access to the raw value as well as the masked value if the corresponding field.

### `autoFocus`

Whether the first field (cardholder name) should steal the focus when this component is rendered. Default `true`.
