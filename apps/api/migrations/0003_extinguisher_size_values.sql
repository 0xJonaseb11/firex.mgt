DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_enum e
		INNER JOIN pg_type t ON e.enumtypid = t.oid
		WHERE t.typname = 'extinguisher_size'
			AND e.enumlabel = '1.5lb'
	) THEN
		CREATE TYPE "public"."extinguisher_size_new" AS ENUM(
			'2.5 lbs.',
			'5 lbs.',
			'9 lbs.',
			'12 lbs.'
		);

		ALTER TABLE "fire_extinguishers" ALTER COLUMN "size" TYPE "extinguisher_size_new" USING (
			CASE "size"::text
				WHEN '1.5lb' THEN '2.5 lbs.'::"extinguisher_size_new"
				WHEN '5lb' THEN '5 lbs.'::"extinguisher_size_new"
				WHEN '9lb' THEN '9 lbs.'::"extinguisher_size_new"
				WHEN '12lb' THEN '12 lbs.'::"extinguisher_size_new"
				ELSE "size"::text::"extinguisher_size_new"
			END
		);

		DROP TYPE "public"."extinguisher_size";
		ALTER TYPE "public"."extinguisher_size_new" RENAME TO "extinguisher_size";
	END IF;
END $$;
