import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";
import {
  Controller,
  useForm,
  useFormState,
  type ControllerProps,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  PressableProps,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/* ====================================================================== *
 * Re-exports — keep the public surface familiar to react-hook-form users
 * ====================================================================== */

export { Controller, useForm };
export type {
  ControllerProps,
  DefaultValues,
  FieldPath,
  FieldValues,
  Resolver,
  UseFormProps,
  UseFormReturn,
};

/* ====================================================================== *
 * Theme tokens
 * ====================================================================== */

const TOKENS = {
  bg: "#FFFFFF",
  fg: "#18181B",
  mutedFg: "#71717A",
  destructive: "#EF4444",
  border: "#E4E4E7",
  primary: "#6366F1",
  primaryFg: "#FFFFFF",
};

/* ====================================================================== *
 * Form context — exposes the full UseFormReturn
 * ====================================================================== */

interface FormContextValue<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
}

const FormContext = createContext<FormContextValue<FieldValues> | null>(null);

export function useFormContext<
  TFieldValues extends FieldValues = FieldValues,
>(): UseFormReturn<TFieldValues> {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error("useFormContext must be used within <Form>.");
  }
  return ctx.form as UseFormReturn<TFieldValues>;
}

/* ====================================================================== *
 * FormField context — bridges FormField name to FormItem & FormMessage
 * ====================================================================== */

interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/* ====================================================================== *
 * <Form>
 * ====================================================================== */

export interface FormProps<
  TFieldValues extends FieldValues = FieldValues,
> extends Omit<UseFormProps<TFieldValues>, "defaultValues"> {
  /** Provide a pre-built form instance (controlled). */
  form?: UseFormReturn<TFieldValues>;
  /** Zod / Yup / Valibot resolver (from @hookform/resolvers). */
  resolver?: Resolver<TFieldValues>;
  defaultValues?: DefaultValues<TFieldValues>;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  reValidateMode?: "onChange" | "onBlur" | "onSubmit";
  criteriaMode?: "firstError" | "all";
  /** Submit handler. */
  onSubmit?: (data: TFieldValues, form: UseFormReturn<TFieldValues>) => void;
  /** Invalid submit handler. */
  onError?: (errors: any, form: UseFormReturn<TFieldValues>) => void;
  /** Wrap in KeyboardAvoidingView for keyboard-aware scrolling. Default true */
  keyboardAware?: boolean;
  /** Scroll container for long forms. Default false */
  scrollable?: boolean;
  /** ScrollView props (only when scrollable). */
  scrollViewProps?: ScrollViewProps;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

function FormInner<TFieldValues extends FieldValues = FieldValues>(
  props: FormProps<TFieldValues>,
  ref: React.Ref<View>,
) {
  const {
    form: providedForm,
    resolver,
    defaultValues,
    mode = "onChange",
    reValidateMode = "onChange",
    criteriaMode = "firstError",
    onSubmit,
    onError,
    keyboardAware = true,
    scrollable = false,
    scrollViewProps,
    className,
    style,
    children,
    ...rest
  } = props;

  // Build (or reuse) the form instance
  const internalForm = useForm<TFieldValues>({
    resolver,
    defaultValues: defaultValues as DefaultValues<TFieldValues>,
    mode,
    reValidateMode,
    criteriaMode,
  });

  const form = (providedForm ?? internalForm) as UseFormReturn<TFieldValues>;

  const handleSubmit = useMemo(
    () =>
      form.handleSubmit(
        (data) => onSubmit?.(data, form),
        (errors) => onError?.(errors, form),
      ),
    [form, onSubmit, onError],
  );

  const ctxValue = useMemo<FormContextValue<TFieldValues>>(
    () => ({ form: form as any }),
    [form],
  );

  // Expose handleSubmit via a ref-like side channel for <FormSubmit>
  (form as any).__rnHandleSubmit = handleSubmit;

  const content = (
    <FormContext.Provider value={ctxValue as any}>
      <View
        ref={ref}
        className={cn("w-full flex flex-col gap-4", className)}
        style={style}
        accessibilityRole="form"
        {...(rest as any)}
      >
        {children}
      </View>
    </FormContext.Provider>
  );

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ width: "100%" }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

export const Form = forwardRef(FormInner) as (<
  TFieldValues extends FieldValues = FieldValues,
>(
  props: FormProps<TFieldValues> & { ref?: React.Ref<View> },
) => React.ReactElement) & { displayName?: string };

Form.displayName = "Form";

/* ====================================================================== *
 * FormItem context — shares field id/name/error between Form elements
 * ====================================================================== */

interface FormItemContextValue {
  id: string;
  name?: string;
  required?: boolean;
  error?: string;
  descriptionId?: string;
  messageId?: string;
  setTouched: (t: boolean) => void;
}

const FormItemContext = createContext<FormItemContextValue | null>(null);

const useFormItemCtx = () => {
  const ctx = useContext(FormItemContext);
  if (!ctx) {
    throw new Error(
      "FormLabel / FormControl / FormDescription / FormMessage must be used within <FormItem>.",
    );
  }
  return ctx;
};

/* ====================================================================== *
 * <FormField>
 * ====================================================================== */

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  render: (params: {
    field: import("react-hook-form").ControllerRenderProps<TFieldValues, TName>;
    fieldState: import("react-hook-form").ControllerFieldState;
    formState: import("react-hook-form").UseFormStateReturn<TFieldValues>;
  }) => React.ReactElement;
  rules?: ControllerProps<TFieldValues, TName>["rules"];
  defaultValue?: any;
  shouldUnregister?: boolean;
  className?: string;
  style?: ViewStyle | ViewStyle[];
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: FormFieldProps<TFieldValues, TName>) {
  const { name, render, rules, defaultValue, shouldUnregister } = props;
  const form = useFormContext<TFieldValues>();

  const fieldContextValue = useMemo(() => ({ name: String(name) }), [name]);

  return (
    <FormFieldContext.Provider value={fieldContextValue}>
      <Controller
        control={form.control}
        name={name}
        rules={rules}
        defaultValue={defaultValue}
        shouldUnregister={shouldUnregister}
        render={({ field, fieldState, formState }) =>
          render({ field, fieldState, formState })
        }
      />
    </FormFieldContext.Provider>
  );
}
FormField.displayName = "FormField";

/* ====================================================================== *
 * <FormItem>
 * ====================================================================== */

export interface FormItemProps {
  className?: string;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  /** Override the field name. */
  name?: string;
  /** Manual required flag. */
  required?: boolean;
}

export const FormItem = forwardRef<View, FormItemProps>((props, ref) => {
  const { className, style, children, name: nameProp, required } = props;
  const id = useId();
  const [touched, setTouched] = React.useState(false);

  const form = useContext(FormContext);
  const fieldContext = useContext(FormFieldContext);
  const fieldName = nameProp ?? fieldContext?.name;
  const error = useFieldError(form?.form, fieldName) ?? undefined;

  const ctxValue = useMemo<FormItemContextValue>(
    () => ({
      id,
      name: fieldName,
      required,
      error,
      setTouched,
    }),
    [id, fieldName, required, error],
  );

  return (
    <FormItemContext.Provider value={ctxValue}>
      <View
        ref={ref}
        className={cn("w-full flex flex-col gap-1.5", className)}
        style={style}
      >
        {children}
      </View>
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

/* Hook: subscribe to a field's error from RHF formState */
function useFieldError(form: UseFormReturn<any> | undefined, name?: string) {
  const { errors } = useFormState({
    control: form?.control,
  });

  if (!name || !errors) return undefined;

  const keys = name.split(".");
  let current: any = errors;
  for (const key of keys) {
    if (!current) return undefined;
    current = current[key];
  }
  return current?.message as string | undefined;
}

/* ====================================================================== *
 * <FormLabel>
 * ====================================================================== */

const labelVariants = cva("text-sm font-medium leading-tight", {
  variants: {
    state: {
      default: "",
      error: "",
      disabled: "",
    },
  },
  defaultVariants: { state: "default" },
});

export interface FormLabelProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle | TextStyle[];
  /** Manually mark as required. */
  required?: boolean;
  /** Position of the required asterisk. */
  requiredPosition?: "start" | "end";
}

export const FormLabel = forwardRef<typeof Animated.Text, FormLabelProps>(
  (props, ref) => {
    const {
      className,
      style,
      children,
      required,
      requiredPosition = "end",
    } = props;
    const item = useFormItemCtx();
    const isRequired = required ?? item.required;
    const isError = !!item.error;

    const textStyle: TextStyle = {
      color: isError ? TOKENS.destructive : TOKENS.fg,
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 18,
    };

    const asterisk = isRequired ? (
      <Animated.Text style={[styles.asterisk, { color: TOKENS.destructive }]}>
        {" "}
        *
      </Animated.Text>
    ) : null;

    return (
      <Animated.View style={styles.labelRow} pointerEvents="none">
        <Animated.Text
          ref={ref as any}
          style={[textStyle, style]}
          nativeID={item.id ? `${item.id}-label` : undefined}
          accessibilityRole="header"
        >
          {requiredPosition === "start" && asterisk}
          {children}
          {requiredPosition === "end" && asterisk}
        </Animated.Text>
      </Animated.View>
    );
  },
);
FormLabel.displayName = "FormLabel";

/* ====================================================================== *
 * <FormControl>
 * ====================================================================== */

export interface FormControlProps extends ViewProps {
  className?: string;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

type ViewProps = { [k: string]: any };

export const FormControl = forwardRef<View, FormControlProps>((props, ref) => {
  const { className, style, children, ...rest } = props;
  const item = useFormItemCtx();

  return (
    <View
      ref={ref}
      className={cn("w-full", className)}
      style={style}
      aria-labelledby={item.id ? `${item.id}-label` : undefined}
      aria-describedby={item.messageId ?? item.descriptionId}
      {...rest}
    >
      {children}
    </View>
  );
});
FormControl.displayName = "FormControl";

/* ====================================================================== *
 * <FormDescription>
 * ====================================================================== */

export interface FormDescriptionProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle | TextStyle[];
}

export const FormDescription = forwardRef<
  typeof Animated.Text,
  FormDescriptionProps
>((props, ref) => {
  const { children, className, style } = props;
  return (
    <Animated.Text
      ref={ref as any}
      style={[
        styles.description,
        { color: TOKENS.mutedFg },
        style as TextStyle,
      ]}
      className={className}
    >
      {children}
    </Animated.Text>
  );
});
FormDescription.displayName = "FormDescription";

/* ====================================================================== *
 * <FormMessage>
 * ====================================================================== */

export interface FormMessageProps {
  /** Override the message content. */
  children?: React.ReactNode;
  className?: string;
  style?: TextStyle | TextStyle[];
  /** Hide even if there's an error. */
  hide?: boolean;
}

export const FormMessage = forwardRef<typeof Animated.Text, FormMessageProps>(
  (props, ref) => {
    const { children, className, style, hide } = props;
    const item = useFormItemCtx();
    const message = children ?? item.error;

    const opacity = useSharedValue(message ? 1 : 0);
    const translateY = useSharedValue(message ? 0 : -4);

    useEffect(() => {
      if (hide || !message) {
        opacity.value = withTiming(0, { duration: 150 });
        translateY.value = withTiming(-4, { duration: 150 });
      } else {
        opacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        translateY.value = withSpring(0, { damping: 18, stiffness: 280 });
      }
    }, [hide, message, opacity, translateY]);

    const animStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));

    if (hide || (!message && !children)) return null;

    return (
      <Animated.Text
        ref={ref as any}
        style={[
          animStyle,
          styles.message,
          { color: TOKENS.destructive },
          style as TextStyle,
        ]}
        className={className}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        {message}
      </Animated.Text>
    );
  },
);
FormMessage.displayName = "FormMessage";

/* ====================================================================== *
 * <FormSubmit>
 * ====================================================================== */

const submitVariants = cva("w-full items-center justify-center rounded-md flex-row", {
  variants: {
    variant: {
      default: "bg-primary",
      outline: "border border-input bg-transparent",
      ghost: "bg-transparent",
      destructive: "bg-destructive",
    },
    size: {
      sm: "h-9 px-3",
      md: "h-11 px-4",
      lg: "h-13 px-6",
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export type SubmitVariant = NonNullable<
  VariantProps<typeof submitVariants>["variant"]
>;
export type SubmitSize = NonNullable<
  VariantProps<typeof submitVariants>["size"]
>;

export interface FormSubmitProps extends Omit<PressableProps, "style"> {
  /** Override the submit label. */
  label?: string;
  /** Custom content (overrides label). */
  children?: React.ReactNode;
  variant?: SubmitVariant;
  size?: SubmitSize;
  /** Disable the button manually. */
  disabled?: boolean;
  /** Show a spinner while submitting. */
  showLoading?: boolean;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
}

export const FormSubmit = forwardRef<typeof Pressable, FormSubmitProps>(
  (props, ref) => {
    const {
      label,
      children,
      variant = "default",
      size = "md",
      disabled = false,
      showLoading = true,
      className,
      style,
      textStyle,
      ...rest
    } = props;

    const form = useFormContext();
    const isSubmitting = form.formState.isSubmitting;
    const isDisabled = disabled || isSubmitting;

    const handleSubmit = useCallback(() => {
      Keyboard.dismiss();
      const fn = (form as any).__rnHandleSubmit;
      if (typeof fn === "function") fn();
    }, [form]);

    const scale = useSharedValue(1);
    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
    }, [scale]);
    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, { damping: 18, stiffness: 320 });
    }, [scale]);
    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const sizeStyle: ViewStyle =
      size === "sm"
        ? { height: 36, paddingHorizontal: 12 }
        : size === "lg"
          ? { height: 50, paddingHorizontal: 24 }
          : { height: 44, paddingHorizontal: 16 };

    const bgStyle: ViewStyle =
      variant === "outline"
        ? {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: TOKENS.border,
          }
        : variant === "ghost"
          ? { backgroundColor: "transparent" }
          : variant === "destructive"
            ? { backgroundColor: TOKENS.destructive }
            : { backgroundColor: TOKENS.primary };

    return (
      <Pressable
        ref={ref as any}
        onPress={handleSubmit}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={styles.submitContainer}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isSubmitting }}
        accessibilityLabel={typeof label === "string" ? label : "Submit"}
        {...rest}
      >
        <Animated.View
          style={[
            styles.submitBase,
            sizeStyle,
            bgStyle,
            animStyle,
            isDisabled && { opacity: 0.5 },
            style as ViewStyle,
          ]}
          className={cn(submitVariants({ variant, size }), className)}
        >
          {showLoading && isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={
                variant === "outline" || variant === "ghost"
                  ? TOKENS.fg
                  : TOKENS.primaryFg
              }
            />
          ) : (
            (children ?? (
              <Animated.Text
                style={[
                  styles.submitText,
                  {
                    color:
                      variant === "outline" || variant === "ghost"
                        ? TOKENS.fg
                        : TOKENS.primaryFg,
                  },
                  textStyle,
                ]}
              >
                {label ?? "Submit"}
              </Animated.Text>
            ))
          )}
        </Animated.View>
      </Pressable>
    );
  },
);
FormSubmit.displayName = "FormSubmit";

/* ====================================================================== *
 * Convenience hooks
 * ====================================================================== */

export function useFormField() {
  const item = useContext(FormItemContext);
  if (!item) {
    throw new Error("useFormField must be used within <FormItem>.");
  }
  return item;
}

/* ====================================================================== *
 * Styles
 * ====================================================================== */

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  asterisk: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  submitContainer: {
    width: "100%",
    marginTop: 8,
  },
  submitBase: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
