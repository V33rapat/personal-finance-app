import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  it('trims and accepts a valid full name', async () => {
    const dto = plainToInstance(UpdateProfileDto, { full_name: '  New Name  ' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.full_name).toBe('New Name');
  });

  it.each([
    { full_name: '' },
    { full_name: '  ' },
    { full_name: 'AB' },
    { full_name: 'A'.repeat(51) },
  ])('rejects an invalid full name: %j', async (value) => {
    const dto = plainToInstance(UpdateProfileDto, value);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects fields outside the update contract', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      full_name: 'Valid Name',
      email: 'attacker@example.com',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
});
