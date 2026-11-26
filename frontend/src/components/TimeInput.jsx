import Input from './Input.jsx'

export default function TimeInput({ label = 'Waktu', step = 300, ...props }) {
  return <Input label={label} type="time" step={step} {...props} />
}
