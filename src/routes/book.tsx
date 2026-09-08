import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Clock,
  CreditCard,
  Calendar,
  User,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import bookingHeroAsset from "@/assets/booking-hero-lashes.webp";
import { bookingPublicApi } from "@/lib/admin-api";
import { AdSlot } from "@/components/ad-slot";
import { TIME_SLOTS } from "@/lib/availability";

const title = "Book A Service — Mayor Beauty Place";
const description =
  "Book beauty treatments and consultations at Mayor Beauty Place in Peckham, London. Professional ethics, quality products, expert care.";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Book,
});

type BookingData = {
  categoryId: string;
  serviceId: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const initialData: BookingData = {
  categoryId: "",
  serviceId: "",
  date: "",
  time: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
};

const steps = [
  { id: 1, label: "Service", icon: Sparkles },
  { id: 2, label: "Time", icon: Clock },
  { id: 3, label: "Details", icon: User },
  { id: 4, label: "Payment", icon: CreditCard },
  { id: 5, label: "Done", icon: Check },
];



const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition";

function formatPrice(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "On request";
  return `£${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function toLocalIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}



function Book() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(initialData);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["booking", "catalog"],
    queryFn: bookingPublicApi.catalog,
  });

  const categories = catalog?.categories ?? [];
  const allServices = catalog?.services ?? [];

  const services = useMemo(
    () => allServices.filter((s) => s.category_id === data.categoryId),
    [allServices, data.categoryId],
  );

  const selectedCategory = categories.find((c) => c.id === data.categoryId);
  const selectedService = allServices.find((s) => s.id === data.serviceId);

  const update = <K extends keyof BookingData>(key: K, value: BookingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!data.categoryId && !!data.serviceId;
      case 2:
        return !!data.date && !!data.time;
      case 3:
        return !!data.name && /^\S+@\S+\.\S+$/.test(data.email);
      case 4:
        return !!data.serviceId && !!data.date && !!data.time;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step === 4) {
      setProcessing(true);
      setError(null);
      try {
        // Nothing is confirmed here: the booking is stored as pending/unpaid and
        // Stripe hosts the payment. Confirmation happens after Stripe verifies it.
        const res = await bookingPublicApi.startCheckout({
          service_id: data.serviceId,
          full_name: data.name,
          email: data.email,
          phone: data.phone,
          preferred_date: data.date,
          preferred_time: data.time,
          notes: data.notes,
        });
        window.location.href = res.url
          ? res.url
          : `/booking-success/${res.booking_reference}`;
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start the payment");
        setProcessing(false);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const selectedDate = data.date ? new Date(`${data.date}T00:00:00`) : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState<Date>(selectedDate ?? today);

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  // Live from the database: which slots on the chosen day are taken, and which
  // days in the visible month have nothing left at all.
  const { data: dayAvailability, isFetching: loadingSlots } = useQuery({
    queryKey: ["booking", "availability", "day", data.date, data.serviceId],
    queryFn: () => bookingPublicApi.dayAvailability(data.date, data.serviceId || undefined),
    enabled: !!data.date,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const { data: monthAvailability } = useQuery({
    queryKey: ["booking", "availability", "month", monthKey, data.serviceId],
    queryFn: () => bookingPublicApi.monthAvailability(monthKey, data.serviceId || undefined),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const takenSlots = useMemo(
    () => new Set(dayAvailability?.unavailable ?? []),
    [dayAvailability],
  );

  const fullyBookedDates = useMemo(
    () =>
      (monthAvailability?.fully_booked ?? []).map((d) => new Date(`${d}T00:00:00`)),
    [monthAvailability],
  );

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = data.date === toLocalIso(new Date());

  const isSlotDisabled = (slot: string) => {
    if (takenSlots.has(slot)) return true;
    if (isToday) {
      const [h, m] = slot.split(":").map(Number);
      if ((h ?? 0) * 60 + (m ?? 0) <= nowMinutes) return true;
    }
    return false;
  };

  // If the chosen time gets booked by someone else, drop it.
  useEffect(() => {
    if (data.time && takenSlots.has(data.time)) {
      update("time", "");
      setError("That time was just booked by someone else. Please pick another.");
    }
  }, [takenSlots, data.time]);


  return (
    <main>
      <section className="relative px-6 pt-32 pb-16 text-on-dark md:px-12 md:pt-40 md:pb-20">
        <img
          src={bookingHeroAsset}
          alt="Lash extension treatment at Mayor Beauty Place"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/40" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <span className="mb-6 inline-flex items-center gap-3 rounded-full border border-on-dark/25 bg-on-dark/10 px-5 py-2 text-xs font-medium tracking-widest text-on-dark/90 uppercase backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
            Book A Service
          </span>
          <h1 className="animate-reveal max-w-3xl font-display text-5xl leading-[1.02] md:text-7xl">
            Reserve Your
            <em className="italic text-brand-red"> Session</em>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed font-light text-on-dark/90">
            Follow the steps below to choose your treatment, time, and details.
          </p>
        </div>
      </section>
      <AdSlot placement="booking_top" />

      <section className="px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border" />
              <div
                className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-brand-blue transition-all duration-500"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
              {steps.map((s) => {
                const Icon = s.icon;
                const isActive = step >= s.id;
                const isCurrent = step === s.id;
                return (
                  <div
                    key={s.id}
                    className="relative z-10 flex flex-col items-center gap-3"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        isActive
                          ? "border-brand-blue bg-brand-blue text-on-brand"
                          : "border-border bg-card text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-brand-blue/20" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`hidden text-[11px] font-medium uppercase tracking-widest sm:block ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-card p-8 shadow-soft md:p-12">
            {step === 1 && (
              <div className="animate-reveal">
                <h2 className="mb-2 font-display text-3xl md:text-4xl">
                  Choose A <em className="italic text-brand-red">Service</em>
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Please select the category and service you would like to book.
                </p>

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories are available right now. Please check back soon.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-base text-brand-blue">
                        Category
                      </Label>
                      <Select
                        value={data.categoryId}
                        onValueChange={(value) => {
                          update("categoryId", value);
                          update("serviceId", "");
                        }}
                      >
                        <SelectTrigger
                          id="category"
                          className="h-12 w-full rounded-xl border-border bg-card px-4 text-sm focus:ring-brand-blue/20"
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card text-foreground shadow-xl">
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service" className="text-base text-brand-blue">
                        Service
                      </Label>
                      <Select
                        value={data.serviceId}
                        onValueChange={(value) => update("serviceId", value)}
                        disabled={!data.categoryId || services.length === 0}
                      >
                        <SelectTrigger
                          id="service"
                          className="h-12 w-full rounded-xl border-border bg-card px-4 text-sm focus:ring-brand-blue/20"
                        >
                          <SelectValue
                            placeholder={
                              !data.categoryId
                                ? "Select category first"
                                : services.length === 0
                                  ? "No services available"
                                  : "Select service"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card text-foreground shadow-xl">
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedService && (
                  <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-display text-lg">{selectedService.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedCategory?.name} • {selectedService.duration_minutes} min
                        </div>
                      </div>
                      <div className="mt-1 font-display text-xl text-brand-red sm:mt-0">
                        {formatPrice(selectedService.price)}
                      </div>
                    </div>
                    {selectedService.description && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {selectedService.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="animate-reveal">
                <h2 className="mb-2 font-display text-3xl md:text-4xl">
                  Pick A <em className="italic text-brand-red">Time</em>
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Choose your preferred appointment date and time slot.
                </p>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-base text-brand-blue">Date</Label>
                    <div className="rounded-2xl border border-border bg-card p-3">
                      <DateCalendar
                        mode="single"
                        required
                        selected={selectedDate}
                        onDayClick={(date, mods) => {
                          if (mods["disabled"]) return;
                          update("date", toLocalIso(date));
                        }}
                        disabled={[{ before: today }, ...fullyBookedDates]}
                        defaultMonth={selectedDate ?? today}
                        month={month}
                        onMonthChange={setMonth}
                        className="pointer-events-auto w-full"
                        modifiersClassNames={{
                          selected:
                            "!bg-brand-blue !text-white [&_button]:!bg-brand-blue [&_button]:!text-white [&_button]:rounded-md",
                        }}
                      />

                    </div>
                    {data.date && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {new Date(`${data.date}T00:00:00`).toLocaleDateString("en-GB", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base text-brand-blue">Time</Label>
                    <p className="text-xs text-muted-foreground">
                      {!data.date
                        ? "Pick a date first to see the free times."
                        : loadingSlots
                          ? "Checking which times are still free…"
                          : "Crossed-out times are already booked."}
                    </p>
                    <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">

                      {TIME_SLOTS.map((slot) => {
                        const disabled = isSlotDisabled(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={disabled}
                            aria-disabled={disabled}
                            title={disabled ? "Already booked" : undefined}
                            onClick={() => !disabled && update("time", slot)}
                            className={`rounded-xl border px-3 py-3 text-sm transition-all ${
                              disabled
                                ? "cursor-not-allowed border-border/60 bg-secondary/40 text-muted-foreground/60 line-through"
                                : data.time === slot
                                  ? "border-brand-blue bg-brand-blue text-on-brand"
                                  : "border-border bg-card hover:border-brand-blue/40 hover:bg-secondary/50"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-reveal">
                <h2 className="mb-2 font-display text-3xl md:text-4xl">
                  Your <em className="italic text-brand-red">Details</em>
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Tell us a little about yourself.
                </p>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Jane Doe"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="jane@example.com"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={data.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+44 7123 456789"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={data.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      placeholder="Anything we should know?"
                      rows={4}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-reveal">
                <h2 className="mb-2 font-display text-3xl md:text-4xl">
                  Secure <em className="italic text-brand-red">Checkout</em>
                </h2>
                <p className="mb-8 text-muted-foreground">
                  Review your booking, then pay securely with Stripe.
                </p>
                <div className="mb-8 rounded-2xl border border-border bg-secondary/50 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="font-medium">{selectedCategory?.name}</span>
                  </div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date & time</span>
                    <span className="font-medium">
                      {data.date} at {data.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-2xl text-brand-red">
                      {formatPrice(selectedService?.price ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 text-sm">
                  <p className="font-medium">Pay securely with Stripe</p>
                  <p className="mt-2 text-muted-foreground">
                    Paid treatments go to Stripe's secure checkout — card, Klarna or Clearpay —
                    and are only confirmed once the payment succeeds. Treatments priced on
                    request are sent to the team to confirm.
                  </p>
                </div>

                {error && <p className="mt-6 text-sm text-brand-red">{error}</p>}

                <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  Card details are handled entirely by Stripe and never touch our servers.
                </p>
              </div>
            )}

            {step === 5 && (
              <div className="animate-reveal flex flex-col items-center py-8 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="mb-4 font-display text-3xl md:text-4xl">
                  Booking <em className="italic text-brand-red">Confirmed</em>
                </h2>
                <p className="mb-8 max-w-md text-muted-foreground">
                  Thank you, {data.name || "guest"}. We have received your request for{" "}
                  {selectedService?.name} on {data.date} at {data.time}. Our team will
                  confirm within 24 hours.
                </p>
                <div className="w-full max-w-md rounded-2xl border border-border bg-secondary/50 p-6 text-left">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="font-medium">{data.date}</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="font-medium">{data.time}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-2xl text-brand-red">
                      {formatPrice(selectedService?.price ?? 0)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setData(initialData);
                    setStep(1);
                  }}
                  className="mt-10 rounded-full bg-brand-red px-10 py-6 text-sm font-semibold text-on-brand shadow-soft transition-colors hover:bg-brand-blue"
                >
                  Book Another Appointment
                </Button>
              </div>
            )}

            {step < 5 && (
              <div className="mt-10 flex items-center justify-between border-t border-border pt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 1}
                  className="rounded-full px-8 py-5 disabled:opacity-30"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || processing}
                  className="rounded-full bg-brand-red px-10 py-5 text-sm font-semibold text-on-brand shadow-soft transition-colors hover:bg-brand-blue disabled:opacity-50"
                >
                  {processing ? "Redirecting…" : step === 4 ? "Pay securely" : "Continue"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      <AdSlot placement="booking_bottom" />
    </main>
  );
}
