import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

type CountdownEvent = {
  id: string;
  name: string;
  date: string;
  emoji: string;
  color: string;
};

function getTimeLeft(date: string) {
  const now = new Date().getTime();
  const target = new Date(date).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isPast: false,
  };
}

function formatDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatTimeInput(date: Date) {
  return date.toTimeString().slice(0, 5);
}

export default function HomeScreen() {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CountdownEvent | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎉");
  const [color, setColor] = useState("#4A90E2");
  const [dateText, setDateText] = useState(formatDateInput(new Date()));
  const [timeText, setTimeText] = useState(formatTimeInput(new Date()));
  const [errorMessage, setErrorMessage] = useState("");

  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("countdown-events", JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((old) => old + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function loadEvents() {
    const saved = await AsyncStorage.getItem("countdown-events");

    if (saved) {
      setEvents(JSON.parse(saved));
    }
  }

  function openAddModal() {
    const now = new Date();

    setEditingEventId(null);
    setName("");
    setEmoji("🎉");
    setColor("#4A90E2");
    setDateText(formatDateInput(now));
    setTimeText(formatTimeInput(now));
    setErrorMessage("");
    setModalVisible(true);
  }

  function openEditModal(event: CountdownEvent) {
    const eventDate = new Date(event.date);

    setEditingEventId(event.id);
    setName(event.name);
    setEmoji(event.emoji);
    setColor(event.color);
    setDateText(formatDateInput(eventDate));
    setTimeText(formatTimeInput(eventDate));
    setErrorMessage("");
    setModalVisible(true);
  }

  function saveEvent() {
    if (name.trim() === "") {
      setErrorMessage("Please enter an event name.");
      return;
    }

    const targetDate = new Date(`${dateText}T${timeText}:00`);

    if (isNaN(targetDate.getTime())) {
      setErrorMessage("Use date as YYYY-MM-DD and time as HH:MM.");
      return;
    }

    if (editingEventId) {
      const updatedEvents = events.map((event) =>
        event.id === editingEventId
          ? {
              ...event,
              name: name.trim(),
              emoji,
              color,
              date: targetDate.toISOString(),
            }
          : event
      );

      setEvents(updatedEvents);

      const updatedSelected = updatedEvents.find(
        (event) => event.id === editingEventId
      );

      if (updatedSelected) {
        setSelectedEvent(updatedSelected);
      }
    } else {
      const newEvent: CountdownEvent = {
        id: Date.now().toString(),
        name: name.trim(),
        emoji,
        color,
        date: targetDate.toISOString(),
      };

      setEvents([...events, newEvent]);
    }

    setModalVisible(false);
  }

  function deleteEvent(id: string) {
    setEvents(events.filter((event) => event.id !== id));
    setSelectedEvent(null);
  }

  function renderTimer(time: ReturnType<typeof getTimeLeft>) {
    return (
      <View style={styles.timerRow}>
        <View style={styles.timeUnit}>
          <Text style={styles.timerNumber}>{time.days}</Text>
          <Text style={styles.timerLabel}>days</Text>
        </View>

        <View style={styles.timeUnit}>
          <Text style={styles.timerNumber}>{time.hours}</Text>
          <Text style={styles.timerLabel}>hours</Text>
        </View>

        <View style={styles.timeUnit}>
          <Text style={styles.timerNumber}>{time.minutes}</Text>
          <Text style={styles.timerLabel}>min</Text>
        </View>

        <View style={styles.timeUnit}>
          <Text style={styles.timerNumber}>{time.seconds}</Text>
          <Text style={styles.timerLabel}>sec</Text>
        </View>
      </View>
    );
  }

  if (selectedEvent) {
    const time = getTimeLeft(selectedEvent.date);

    return (
      <View style={[styles.detailContainer, { backgroundColor: selectedEvent.color }]}>
        <TouchableOpacity onPress={() => setSelectedEvent(null)}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.bigEmoji}>{selectedEvent.emoji}</Text>
        <Text style={styles.detailTitle}>{selectedEvent.name}</Text>

        <View style={styles.timerBox}>{renderTimer(time)}</View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(selectedEvent)}
        >
          <Text style={styles.editText}>Edit Countdown</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteEvent(selectedEvent.id)}
        >
          <Text style={styles.deleteText}>Delete Countdown</Text>
        </TouchableOpacity>

        <EventModal
          visible={modalVisible}
          editing={!!editingEventId}
          name={name}
          setName={setName}
          emoji={emoji}
          setEmoji={setEmoji}
          color={color}
          setColor={setColor}
          dateText={dateText}
          setDateText={setDateText}
          timeText={timeText}
          setTimeText={setTimeText}
          errorMessage={errorMessage}
          onSave={saveEvent}
          onCancel={() => setModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Countdowns</Text>

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ Add Countdown</Text>
      </TouchableOpacity>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No countdowns yet</Text>
        }
        renderItem={({ item }) => {
          const time = getTimeLeft(item.date);

          return (
            <TouchableOpacity onPress={() => setSelectedEvent(item)}>
              <View style={[styles.card, { backgroundColor: item.color }]}>
                <Text style={styles.eventName}>
                  {item.emoji} {item.name}
                </Text>

                <Text style={styles.daysLeft}>
                  {time.isPast
                    ? "Event passed"
                    : `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s left`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <EventModal
        visible={modalVisible}
        editing={!!editingEventId}
        name={name}
        setName={setName}
        emoji={emoji}
        setEmoji={setEmoji}
        color={color}
        setColor={setColor}
        dateText={dateText}
        setDateText={setDateText}
        timeText={timeText}
        setTimeText={setTimeText}
        errorMessage={errorMessage}
        onSave={saveEvent}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

function EventModal({
  visible,
  editing,
  name,
  setName,
  emoji,
  setEmoji,
  color,
  setColor,
  dateText,
  setDateText,
  timeText,
  setTimeText,
  errorMessage,
  onSave,
  onCancel,
}: any) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>
          {editing ? "Edit Countdown" : "New Countdown"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Event name"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Emoji"
          value={emoji}
          onChangeText={setEmoji}
        />

        <Text style={styles.label}>Date</Text>

        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={dateText}
          onChangeText={setDateText}
        />

        <Text style={styles.label}>Time</Text>

        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={timeText}
          onChangeText={setTimeText}
        />

        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <Text style={styles.label}>Choose color</Text>

        <View style={styles.colorRow}>
          {["#4A90E2", "#50C878", "#FF6B6B", "#9B59B6", "#F39C12"].map(
            (itemColor) => (
              <TouchableOpacity
                key={itemColor}
                style={[
                  styles.colorCircle,
                  { backgroundColor: itemColor },
                  color === itemColor && styles.selectedColor,
                ]}
                onPress={() => setColor(itemColor)}
              />
            )
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveButtonText}>
            {editing ? "Save Changes" : "Save Countdown"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  card: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
  },
  eventName: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
  },
  daysLeft: {
    fontSize: 18,
    color: "white",
    marginTop: 10,
  },
  emptyText: {
    color: "gray",
    textAlign: "center",
    marginTop: 40,
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#111",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 14,
    padding: 15,
    fontSize: 18,
    marginBottom: 15,
    color: "white",
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 10,
    color: "white",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 16,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  colorCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  selectedColor: {
    borderWidth: 4,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 18,
    marginTop: 20,
  },
  saveButtonText: {
    color: "#111",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 18,
    color: "white",
  },
  detailContainer: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  backButton: {
    color: "white",
    fontSize: 20,
    marginBottom: 40,
  },
  bigEmoji: {
    fontSize: 90,
    textAlign: "center",
  },
  detailTitle: {
    color: "white",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  timerBox: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 20,
    padding: 20,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeUnit: {
    alignItems: "center",
    flex: 1,
  },
  timerNumber: {
    color: "white",
    fontSize: 34,
    fontWeight: "bold",
  },
  timerLabel: {
    color: "white",
    fontSize: 14,
  },
  editButton: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 18,
    marginTop: 30,
  },
  editText: {
    color: "#111",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 16,
    borderRadius: 18,
    marginTop: 20,
  },
  deleteText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
});