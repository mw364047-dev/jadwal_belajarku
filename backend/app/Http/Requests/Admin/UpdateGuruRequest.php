<?php

namespace App\Http\Requests\Admin;

use App\Models\GuruBk;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuruRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Otorisasi utama tetap ditegakkan oleh middleware role:admin pada route.
        return true;
    }

    public function rules(): array
    {
        $guru = $this->route('guru');
        $userId = $guru instanceof GuruBk ? $guru->user_id : null;
        $guruId = $guru instanceof GuruBk ? $guru->getKey() : null;

        $usernameUnique = Rule::unique('users', 'username');
        $emailUnique = Rule::unique('users', 'email');
        $nipUnique = Rule::unique('guru_bk', 'nip');

        if ($userId) {
            $usernameUnique->ignore($userId);
            $emailUnique->ignore($userId);
        }

        if ($guruId) {
            $nipUnique->ignore($guruId);
        }

        return [
            'nama' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:50', $usernameUnique],
            'email' => ['nullable', 'email', 'max:255', $emailUnique],
            'nip' => ['nullable', 'string', 'max:30', $nipUnique],
            'jabatan' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama guru BK wajib diisi.',
            'nama.max' => 'Nama maksimal 120 karakter.',
            'username.required' => 'Username wajib diisi.',
            'username.unique' => 'Username sudah digunakan akun lain.',
            'email.email' => 'Format email belum benar.',
            'email.unique' => 'Email sudah digunakan akun lain.',
            'nip.unique' => 'NIP sudah terdaftar.',
        ];
    }

    public function attributes(): array
    {
        return [
            'nama' => 'nama guru BK',
            'username' => 'username',
            'email' => 'email',
            'nip' => 'NIP',
            'jabatan' => 'jabatan',
        ];
    }
}
