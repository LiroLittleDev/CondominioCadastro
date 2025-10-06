import React from "react";
import { TextField } from "@mui/material";
import { IMaskInput } from "react-imask";
import PropTypes from "prop-types";

const MaskInput = React.forwardRef(function MaskInput(props, ref) {
  const { onChange, onComplete, mask, ...other } = props;
  
  return (
    <IMaskInput
      {...other}

      mask={mask}
      definitions={{
        "#": /[0-9]/,
        "A": /[A-Za-z]/,
        "0": /[0-9]/,
      }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      onComplete={(value) => onComplete && onComplete(value)}
      overwrite
    />
  );
});

MaskInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
  mask: PropTypes.string.isRequired,
};

function MaskedTextField({ 
  mask, 
  onComplete, 
  variant = "standard",
  error,
  helperText,
  ...textFieldProps 
}) {
  return (
    <TextField
      {...textFieldProps}
      error={error}
      helperText={helperText}
      InputProps={{
        inputComponent: MaskInput,
        inputProps: {
          mask,
          onComplete,
        },
      }}
    />
  );
}

MaskedTextField.propTypes = {
  mask: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  variant: PropTypes.string,
  error: PropTypes.bool,
  helperText: PropTypes.string,
};

export default MaskedTextField;