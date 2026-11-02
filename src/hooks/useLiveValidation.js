import { useState, useCallback, useMemo } from 'react';
import { buildConditions } from '../helpers/validation';

export default function useLiveValidation(formData, schema) {
  const [touched, setTouched] = useState({});

  // Las condiciones se calculan con el mismo constructor que usan los
  // formularios, así FieldValidation recibe siempre [{ label, met }].
  const conditions = useMemo(() => {
    const result = {};
    for (const field of Object.keys(schema)) {
      result[field] = buildConditions(schema, field, formData);
    }
    return result;
  }, [formData, schema]);

  const { errors, passed } = useMemo(() => {
    const nextErrors = {};
    const nextPassed = {};

    for (const [field, fieldConditions] of Object.entries(conditions)) {
      const fieldErrors = fieldConditions.filter((condition) => !condition.met).map((condition) => condition.label);
      const fieldPassed = fieldConditions.filter((condition) => condition.met).map((condition) => condition.label);

      if (fieldErrors.length > 0) nextErrors[field] = fieldErrors;
      if (fieldPassed.length > 0) nextPassed[field] = fieldPassed;
    }

    return { errors: nextErrors, passed: nextPassed };
  }, [conditions]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const touch = useCallback((field) => {
    setTouched((prev) => {
      if (prev[field]) return prev;
      return { ...prev, [field]: true };
    });
  }, []);

  const touchAll = useCallback(() => {
    const allTouched = {};
    for (const field of Object.keys(schema)) {
      allTouched[field] = true;
    }
    setTouched(allTouched);
  }, [schema]);

  const handleChangeWithTouch = useCallback((field, value, setter) => {
    setter((prev) => ({ ...prev, [field]: value }));
    touch(field);
  }, [touch]);

  const getFieldProps = useCallback((field, setter) => ({
    value: formData[field] || '',
    onChange: (e) => {
      const val = e.target?.value !== undefined ? e.target.value : e;
      handleChangeWithTouch(field, val, setter);
    },
    onBlur: () => touch(field),
  }), [formData, handleChangeWithTouch, touch]);

  return {
    errors,
    passed,
    conditions,
    isValid,
    touched,
    touch,
    touchAll,
    handleChangeWithTouch,
    getFieldProps,
  };
}
