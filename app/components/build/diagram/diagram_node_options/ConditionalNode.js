import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import DoneIcon from '@material-ui/icons/Done';
import CancelIcon from '@material-ui/icons/Cancel';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import RequireRow from '../../build_components/RequireRow';

const styles = theme => ({
  paper: {
    position: 'absolute',
    width: theme.spacing.unit * 50,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing.unit * 4
  },
  fab: {
    margin: theme.spacing.unit
  },
  rightIcon: {
    display: 'flex',
    'justify-content': 'flex-end'
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 400
  },
  button: {
    margin: theme.spacing.unit
  }
});

class ConditionalNode extends React.Component {
  state = {
    comp: '==',
    displayVar1: '',
    var1: '', // eslint-disable-line react/no-unused-state
    displayVar2: '',
    var2: '' // eslint-disable-line react/no-unused-state
  };

  render() {
    const { classes, close, submit } = this.props;

    return (
      <FormControl className={classes.formControl}>
        <RequireRow
          showMessage={false}
          updateRequire={state => this.setState(state)}
          require={this.state}
        />
        <br />

        <div className={classes.rightIcon}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={close}
          >
            Cancel
            <CancelIcon />
          </Button>

          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => {
              if (!this.state.displayVar1 || !this.state.displayVar2) {
                return;
              }
              close();
              submit(
                `${this.state.displayVar1} ${this.state.comp} ${this.state.displayVar2}`,
                {
                  var1: this.state.displayVar1,
                  var2: this.state.displayVar2,
                  comp: this.state.comp,
                  type: 'conditional'
                }
              );
            }}
          >
            Done
            <DoneIcon />
          </Button>
        </div>
      </FormControl>
    );
  }
}

ConditionalNode.propTypes = {
  classes: PropTypes.object.isRequired,
  close: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired
};

export default withStyles(styles, { withTheme: true })(ConditionalNode);
