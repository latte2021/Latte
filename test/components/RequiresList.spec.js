import React from 'react';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { createMount } from '@material-ui/core/test-utils';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import RequiresList from '../../app/components/build/build_components/RequiresList';
import RequireRow from '../../app/components/build/build_components/RequireRow';

Enzyme.configure({ adapter: new Adapter() });

function singleRowSetup() {
  const onchange = jest.fn();
  const component = createMount()(
    <RequiresList
      onChangeRequire={onchange}
      vars={{}}
      entities={{}}
      requires={[]}
      header="test header"
      tooltipText="test tooltip"
    />
  );
  const rows = component.find(RequireRow);
  const button = component.find(Button);
  const emptyRequire = {
    var1: '',
    displayVar1: '',
    comp: '==',
    var2: '',
    displayVar2: '',
    requireMessage: ''
  };
  return { component, rows, button, onchange, emptyRequire };
}

function threeRowSetup() {
  const oldRequire = {
    var1: 'original',
    displayVar1: 'original',
    comp: '==',
    var2: 'oldVal',
    displayVar2: 'oldVal',
    requireMessage: 'oldMsg'
  };
  const newRequire = {
    var1: 'new',
    displayVar1: 'new',
    comp: '!=',
    var2: 'newVal',
    displayVar2: 'newVal',
    requireMessage: 'newMsg'
  };
  const onchange = jest.fn();
  const component = createMount()(
    <RequiresList
      onChangeRequire={onchange}
      vars={{}}
      entities={{}}
      requires={[oldRequire, oldRequire, oldRequire]}
      header="test header"
      tooltipText="test tooltip"
    />
  );
  const rows = component.find(RequireRow);
  return {component, rows, onchange, oldRequire, newRequire};
}

describe('RequiresList component', () => {
  it('initial state should be correct', () => {
    const { component, rows, emptyRequire } = singleRowSetup();
    expect(rows).toHaveLength(1);
    const header = component.find(Typography);
    const tooltip = component.find(Tooltip);
    expect(header.text()).toBe('test header');
    expect(tooltip.props().title).toBe('test tooltip');
    expect(rows.at(0).props().require).toEqual(emptyRequire);
  });

  it('should add new row when button is clicked', () => {
    const { rows, button, emptyRequire, onchange } = singleRowSetup();
    expect(rows).toHaveLength(1);
    expect(rows.at(0).props().require).toEqual(emptyRequire);
    button.props().onClick();
    expect(onchange).toHaveBeenCalledWith([emptyRequire, emptyRequire]);
  });

  it('should update variable correctly when require row is altered', () => {
    const { rows, onchange } = singleRowSetup();
    const updatedRow = {
      displayVar1: 'Test Str',
      var1: 'test_str',
      displayVar2: 'string',
      var2: 'string',
      requireMessage: 'test msg',
      comp: '=='
    };
    rows
      .at(0)
      .props()
      .updateRequire(updatedRow);
    expect(onchange).toHaveBeenCalledWith([updatedRow]);
  });

  it('should change only the correct row when 1st require row is altered', () => {
    const { rows, onchange, oldRequire, newRequire } = threeRowSetup();
    rows
      .at(0)
      .props()
      .updateRequire(newRequire);
    expect(onchange).toHaveBeenCalledWith([newRequire, oldRequire, oldRequire]);
  });

  it('should change only the correct row when 2nd require row is altered', () => {
    const { rows, onchange, oldRequire, newRequire } = threeRowSetup();
    rows
      .at(1)
      .props()
      .updateRequire(newRequire);
    expect(onchange).toHaveBeenCalledWith([oldRequire, newRequire, oldRequire]);
  });

  it('should change only the correct row when 3rd require row is altered', () => {
    const { rows, onchange, oldRequire, newRequire } = threeRowSetup();
    rows
      .at(2)
      .props()
      .updateRequire(newRequire);
    expect(onchange).toHaveBeenCalledWith([oldRequire, oldRequire, newRequire]);
  });
});
