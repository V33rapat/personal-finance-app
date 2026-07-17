import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

describe('ChangePasswordDto', () => {
  it('accepts a current password and a strong new password', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      current_password: 'CurrentPassword1',
      new_password: 'NewPassword2',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    { current_password: '', new_password: 'NewPassword2' },
    { current_password: 'CurrentPassword1', new_password: 'short' },
    { current_password: 'CurrentPassword1', new_password: 'lowercaseonly' },
    { current_password: 'CurrentPassword1', new_password: 'UPPERCASEONLY' },
  ])('rejects an invalid password change payload: %j', async (value) => {
    const dto = plainToInstance(ChangePasswordDto, value);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects fields outside the password change contract', async () => {
    const dto = plainToInstance(ChangePasswordDto, {
      current_password: 'CurrentPassword1',
      new_password: 'NewPassword2',
      user_id: 'another-user',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'user_id')).toBe(true);
  });
});
