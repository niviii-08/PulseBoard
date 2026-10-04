import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { RiskBadge, SentimentBadge, AlertSeverityBadge, SourceStatusBadge } from "@/components/trends/badges";

describe("StatusBadge", () => {
  it("renders the correct label for each tone, never relying on color alone", () => {
    const { rerender } = render(<StatusBadge tone="positive" label="Low" />);
    expect(screen.getByText("Low")).toBeInTheDocument();

    rerender(<StatusBadge tone="warning" label="Moderate" />);
    expect(screen.getByText("Moderate")).toBeInTheDocument();

    rerender(<StatusBadge tone="critical" label="Critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});

describe("Domain badges", () => {
  it("RiskBadge renders each risk level", () => {
    const { rerender } = render(<RiskBadge level="LOW" />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
    rerender(<RiskBadge level="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("SentimentBadge renders each sentiment label", () => {
    render(<SentimentBadge label="negative" />);
    expect(screen.getByText("Negative")).toBeInTheDocument();
  });

  it("AlertSeverityBadge renders severity", () => {
    render(<AlertSeverityBadge severity="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("SourceStatusBadge distinguishes connected from not-configured", () => {
    const { rerender } = render(<SourceStatusBadge status="connected" />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    rerender(<SourceStatusBadge status="not_configured" />);
    expect(screen.getByText("Not configured")).toBeInTheDocument();
  });
});

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard label="Active alerts" value="3" />);
    expect(screen.getByText("Active alerts")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders trend direction and label when provided", () => {
    render(<MetricCard label="Trend score" value="91" trend={{ direction: "up", label: "+12" }} />);
    expect(screen.getByText("+12")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title and optional message", () => {
    render(<EmptyState title="No brands yet" message="Add one to get started." />);
    expect(screen.getByText("No brands yet")).toBeInTheDocument();
    expect(screen.getByText("Add one to get started.")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("calls onRetry when the retry button is clicked", async () => {
    let retried = false;
    render(<ErrorState onRetry={() => (retried = true)} />);
    screen.getByRole("button", { name: /try again/i }).click();
    expect(retried).toBe(true);
  });
});
