import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsView from './SettingsView';

// Mock the fetch function to prevent real API calls during tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]), // Start with an empty list of users
  })
);

describe('SettingsView Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders the main headings correctly', () => {
    render(<SettingsView token="fake-token" currentUserRole="superadmin" />);
    
    // Check if the "Add New User" heading is on the page
    expect(screen.getByText(/Add New User/i)).toBeInTheDocument();

    // Check if the "Manage Users" heading is on the page
    expect(screen.getByText(/Manage Users/i)).toBeInTheDocument();
  });

  test('shows an empty state message when no users are fetched', async () => {
    render(<SettingsView token="fake-token" currentUserRole="superadmin" />);

    // The component fetches data, so we need to wait for the result
    // The "findBy" queries wait for elements to appear
    const emptyMessage = await screen.findByText(/No users found/i);
    expect(emptyMessage).toBeInTheDocument();
  });
});