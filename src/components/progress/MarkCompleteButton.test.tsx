import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkCompleteButton } from './MarkCompleteButton';

describe('MarkCompleteButton', () => {
  it('should show the button text', () => {
    render(<MarkCompleteButton week="01" slug="lab" />);
    expect(screen.getByRole('button')).toBeDefined();
  });
});
