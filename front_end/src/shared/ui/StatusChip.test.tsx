import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { StatusChip } from './StatusChip';

const theme = createTheme({ palette: { accent: { main: '#7C3AED' } } });

describe('StatusChip', () => {
  it('renders every tone, including the app-only accent', () => {
    render(
      <ThemeProvider theme={theme}>
        {(['default', 'info', 'success', 'warning', 'error', 'accent'] as const).map((tone) => (
          <StatusChip key={tone} label={tone} tone={tone} />
        ))}
      </ThemeProvider>,
    );
    expect(screen.getByText('accent')).toBeInTheDocument();
    expect(screen.getAllByText(/^(default|info|success|warning|error|accent)$/)).toHaveLength(6);
  });

  it('falls back to neutral without the app theme', () => {
    render(<StatusChip label="AI" tone="accent" />);
    expect(screen.getByText('AI')).toBeInTheDocument();
  });
});
