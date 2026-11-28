import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'
import { formatVietnam, formatVietnamDate, formatVietnamDateTime, getVietnamDateTimeLocal, getVietnamWeekday, parseApiTimestamp, toVietnamIsoString } from '../src/utils/vietnamTime.ts'

test('QC UTC timestamps display in Vietnam time with or without the SQL timezone suffix', () => {
  const expected = formatVietnamDateTime('2026-11-24T09:30:00+07:00')
  assert.match(expected, /09:30/)
  assert.match(expected, /24\/11\/2026/)
  for (const value of ['2026-11-24T02:30:00', '2026-11-24T02:30:00Z', '2026-11-24T02:30:00.0000000', new Date('2026-11-24T02:30:00Z')]) {
    assert.equal(formatVietnamDateTime(value), expected)
  }
})

test('QC dates roll over at Vietnam midnight and empty or invalid dates stay safe', () => {
  assert.equal(formatVietnamDate('2026-11-23T17:05:00'), '24/11/2026')
  assert.equal(formatVietnamDate('2026-11-23T17:05:00Z'), '24/11/2026')
  for (const value of [null, undefined, '', 'invalid']) {
    assert.equal(formatVietnamDateTime(value), '—')
    assert.equal(formatVietnamDate(value), '—')
  }
})

test('Vietnam measurement inputs round trip without adding the offset twice', () => {
  const input = getVietnamDateTimeLocal(new Date('2026-11-23T17:05:00Z'))
  assert.equal(input, '2026-11-24T00:05')
  const payload = toVietnamIsoString(input)
  assert.equal(payload, '2026-11-24T00:05:00+07:00')
  assert.equal(toVietnamIsoString(payload), payload)
  assert.match(formatVietnamDateTime(payload), /00:05/)
})

test('calendar dates and style-based formatters retain their Vietnam day', () => {
  assert.equal(formatVietnamDate('2026-11-27'), '27/11/2026')
  assert.equal(formatVietnam('2026-11-27', { day: '2-digit', month: '2-digit', year: 'numeric' }), '27/11/2026')
  assert.doesNotThrow(() => formatVietnamDateTime('2026-11-26T17:00:00Z', { dateStyle: 'short', timeStyle: 'short' }))
  assert.doesNotThrow(() => formatVietnamDate('2026-11-27', { dateStyle: 'medium' }))
  assert.equal(getVietnamWeekday(parseApiTimestamp('2026-11-26T17:00:00Z')), 5)
})

test('QC display is independent of the device timezone', () => {
  const moduleUrl = new URL('../src/utils/vietnamTime.ts', import.meta.url).href
  const script = `import { formatVietnamDateTime, formatVietnamDate } from ${JSON.stringify(moduleUrl)};
    process.stdout.write(JSON.stringify([
      formatVietnamDateTime('2026-11-23T17:05:00'),
      formatVietnamDateTime('2026-11-24T00:05:00+07:00'),
      formatVietnamDate('2026-11-23T17:05:00Z')
    ]))`
  const outputs = ['UTC', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles'].map(TZ =>
    execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], {
      env: { ...process.env, TZ }, encoding: 'utf8',
    })
  )
  for (const output of outputs) {
    assert.equal(output, outputs[0])
    const [unzoned, zoned, date] = JSON.parse(output)
    assert.equal(unzoned, zoned)
    assert.match(unzoned, /00:05/)
    assert.equal(date, '24/11/2026')
  }
})
