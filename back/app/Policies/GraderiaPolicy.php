<?php

namespace App\Policies;

use App\Models\Graderia;
use App\Models\User;

class GraderiaPolicy
{
    public function view(User $user, Graderia $graderia): bool
    {
        return (int)$graderia->user_id === (int)$user->id;
    }

    public function update(User $user, Graderia $graderia): bool
    {
        return (int)$graderia->user_id === (int)$user->id;
    }

    public function delete(User $user, Graderia $graderia): bool
    {
        return (int)$graderia->user_id === (int)$user->id;
    }
}
