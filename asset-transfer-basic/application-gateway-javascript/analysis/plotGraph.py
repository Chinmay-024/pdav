import random
import time
import matplotlib.pyplot as plt

def measure_encryption_time(number_of_users):
    start_time = time.time()

    # Simulate encryption for a random amount of time (replace this with your actual encryption logic)
    time.sleep(random.uniform(0.1, 1.0))

    end_time = time.time()
    time_taken = end_time - start_time
    return time_taken

def plot_graph(x_values, y_values, save_path=None):
    plt.plot(x_values, y_values, marker='o')
    plt.title('Time taken to aggregate data vs number of users')
    plt.xlabel('User Number')
    plt.ylabel('Time taken (milliseconds)')

    if save_path:
        plt.savefig(save_path)
    else:
        plt.show()

def main():
    x_values = [1, 2, 3, 4,  5,6, 7, 8, 9, 10]
    y_values = [29.28,  31.00,
  73.62,  108.72,
  120.77,
  132.21, 148.94,
  160.69, 170.88,186.51]
    # json_file_path = os.path.join("app", "test", "user_vs_time_graph.json")
    save_path = "aggregator_data_vs_time_graph.png"  # Change the file name as needed
    plot_graph(x_values, y_values, save_path)

if __name__ == "__main__":
    main()
