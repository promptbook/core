import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParameterControls } from '../ParameterControls';
import { Parameter } from '../../../types';

describe('ParameterControls', () => {
  const mockParameter: Parameter = {
    id: '0',
    name: 'threshold',
    value: '50',
    type: 'number',
    min: 0,
    max: 100,
  };

  it('renders number input with slider for number type', () => {
    render(
      <ParameterControls
        parameter={mockParameter}
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(50);
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(
      <ParameterControls
        parameter={mockParameter}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '75' } });

    expect(onChange).toHaveBeenCalledWith('75');
  });

  it('renders text input for string type', () => {
    const stringParam: Parameter = {
      id: '1',
      name: 'filename',
      value: 'data.csv',
      type: 'string',
    };

    render(
      <ParameterControls
        parameter={stringParam}
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('data.csv')).toBeInTheDocument();
  });
});
