<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class AuthenticationSecurityTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_account_is_locked_after_five_failed_password_attempts(): void
    {
        $user = $this->makeSecurityUser('siswa', 'lock-test-user');

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $response = $this->withHeaders([
                'Origin' => 'http://localhost:5173',
                'Referer' => 'http://localhost:5173/login',
            ])->postJson('/api/login', [
                'username' => 'lock-test-user',
                'password' => 'WrongPassword123!',
            ]);

            $response->assertStatus($attempt === 5 ? 423 : 401);
        }

        $user->refresh();
        $this->assertSame(5, (int) $user->failed_login_count);
        $this->assertNotNull($user->locked_until);
        $this->assertTrue($user->locked_until->isFuture());

        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/login',
        ])->postJson('/api/login', [
            'username' => 'lock-test-user',
            'password' => 'SecurityTest123!',
        ])->assertStatus(423);
    }

    public function test_inactive_account_cannot_login_even_with_the_correct_password(): void
    {
        $this->makeSecurityUser('siswa', 'inactive-test-user', active: false);

        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/login',
        ])->postJson('/api/login', [
            'username' => 'inactive-test-user',
            'password' => 'SecurityTest123!',
        ])->assertForbidden()->assertJsonPath('code', 'ACCOUNT_INACTIVE');
    }
}
