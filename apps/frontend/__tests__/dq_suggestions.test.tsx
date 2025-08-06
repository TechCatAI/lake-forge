import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import DQSuggestionsPage from '../src/app/dq-suggestions/page'
import * as api from '../src/lib/api'

const SAMPLE = [
  {
    id: 1,
    table_name: 'c.s.t',
    rule_name: 'r',
    rule_sql: 'select 1',
    severity: 'warn',
    suggestion_status: 'new',
    profiled_at: '2024-01-01',
    note: null,
  },
]

describe('dq suggestions page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('edit cell updates severity', async () => {
    vi.spyOn(api, 'fetchDQSuggestions').mockResolvedValue(SAMPLE)
    const update = vi
      .spyOn(api, 'updateDQSuggestion')
      .mockResolvedValue({ ...SAMPLE[0], severity: 'fail' })
    render(<DQSuggestionsPage />)
    await screen.findAllByText('r')
    const select = screen.getByDisplayValue('warn')
    fireEvent.change(select, { target: { value: 'fail' } })
    await waitFor(() => expect(update).toHaveBeenCalled())
  })

  it('formats profiled_at column', async () => {
    vi.spyOn(api, 'fetchDQSuggestions').mockResolvedValue(SAMPLE)
    render(<DQSuggestionsPage />)
    expect(
      await screen.findByText('1/1/24, 12:00 AM'),
    ).toBeInTheDocument()
  })

  it('accept/reject toggles status', async () => {
    vi.spyOn(api, 'fetchDQSuggestions').mockResolvedValue(SAMPLE)
    vi.spyOn(api, 'updateDQSuggestion').mockResolvedValue(SAMPLE[0])
    const bulk = vi.spyOn(api, 'bulkUpdateDQSuggestions').mockResolvedValue()
    render(<DQSuggestionsPage />)
    await screen.findAllByText('r')
    const boxes = screen.getAllByRole('checkbox')
    const checkbox = boxes[boxes.length - 1]
    fireEvent.click(checkbox)
    const acceptBtn = await screen.findByText('Accept')
    fireEvent.click(acceptBtn)
    await waitFor(() => expect(bulk).toHaveBeenCalledWith([1], 'accept'))
    expect(await screen.findByText('accepted')).toBeTruthy()
    fireEvent.click(checkbox)
    const rejectBtn = screen.getByText('Reject')
    fireEvent.click(rejectBtn)
    await waitFor(() => expect(bulk).toHaveBeenLastCalledWith([1], 'reject'))
    expect(await screen.findByText('rejected')).toBeTruthy()
  })

  it('submit triggers POST and removes rows', async () => {
    const accepted = [{ ...SAMPLE[0], suggestion_status: 'accepted' }]
    const fetchSpy = vi
      .spyOn(api, 'fetchDQSuggestions')
      .mockResolvedValueOnce(accepted)
      .mockResolvedValueOnce([])
    vi.spyOn(api, 'updateDQSuggestion').mockResolvedValue(accepted[0])
    const impl = vi.spyOn(api, 'implementDQSuggestions').mockResolvedValue()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<DQSuggestionsPage />)
    await screen.findAllByText('r')
    const boxes = screen.getAllByRole('checkbox')
    const checkbox = boxes[boxes.length - 1]
    fireEvent.click(checkbox)
    const submitBtn = (await screen.findAllByRole('button', { name: 'Submit' })).pop()!
    fireEvent.click(submitBtn)
    await waitFor(() => expect(impl).toHaveBeenCalled())
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })
})
